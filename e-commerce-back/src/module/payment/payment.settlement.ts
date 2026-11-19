/** Transactional application of a verified payment event (MVP-16/MVP-17/MVP-19).
 *
 * The ledger insert, the order transition, the one-time stock release, and the
 * audit entries all run in ONE MongoDB transaction. The unique ledger index on
 * `{ provider, providerTransactionId }` is what makes a retried callback a
 * no-op: the duplicate insert aborts the transaction before any stock or status
 * write can happen.
 */
import { createHash } from "node:crypto";

import mongoose from "mongoose";

import { env } from "../../../config/env.service.js";
import { HttpError } from "../../common/utils/httpError.js";
import { IOrderStatusHistoryEntry, orderModel } from "../../database/model/order.model.js";
import { paymentTransactionModel } from "../../database/model/payment.model.js";
import { collectStockRequirements, parseOrderItems, releaseStock } from "../order/order.stock.js";

import { decidePaymentSettlement } from "./payment.events.js";
import type { PaymentProcessingResult, VerifiedPaymentEvent } from "./payment.types.js";

export interface SettlementOutcome {
  result: PaymentProcessingResult;
  changed: boolean;
  orderId: string | null;
  reason: string;
}

/** Short digest for correlation; the raw payload (which may contain card data) is never stored. */
const digestPayload = (payload: Record<string, unknown>): string =>
  createHash("sha256").update(JSON.stringify(payload)).digest("hex").slice(0, 32);

const isDuplicateKey = (error: unknown): boolean =>
  Boolean(error && typeof error === "object" && (error as { code?: number }).code === 11000);

interface LedgerInput {
  orderId: mongoose.Types.ObjectId | null;
  event: VerifiedPaymentEvent;
}

const recordOrphanEvent = async (
  event: VerifiedPaymentEvent,
  result: PaymentProcessingResult,
  reason: string,
): Promise<SettlementOutcome> => {
  try {
    await paymentTransactionModel.create({
      orderId: null,
      orderNumber: event.orderNumber,
      provider: event.provider,
      providerTransactionId: event.providerTransactionId,
      intentionId: event.providerSessionId,
      amountMinor: event.amountMinor,
      currency: event.currency,
      status: event.status,
      success: event.success,
      hmacVerified: event.source === "webhook",
      source: event.source,
      result,
      reason,
      payloadDigest: digestPayload(event.payload),
      processedAt: new Date(),
    });
  } catch (error) {
    if (!isDuplicateKey(error)) {
      throw error;
    }
    return { result: "duplicate", changed: false, orderId: null, reason: "Duplicate provider event" };
  }

  return { result, changed: false, orderId: null, reason };
};

/**
 * Applies one verified event. Safe to call for webhooks, inquiries, and retries:
 * repeating the same provider transaction id never changes the order twice.
 */
export const settlePaymentEvent = async (event: VerifiedPaymentEvent): Promise<SettlementOutcome> => {
  const order = await orderModel.findOne({ orderNumber: event.orderNumber });
  if (!order) {
    return recordOrphanEvent(event, "unknown_order", "No order matches this merchant order number");
  }

  const session = await mongoose.startSession();
  let outcome: SettlementOutcome = {
    result: "failed",
    changed: false,
    orderId: String(order._id),
    reason: "Settlement did not run",
  };

  try {
    session.startTransaction();

    // Reload inside the transaction so the decision is based on committed state.
    const current = await orderModel.findById(order._id).session(session);
    if (!current) {
      throw new HttpError(404, "Order disappeared during payment settlement");
    }

    const decision = decidePaymentSettlement(
      {
        paymentMethod: current.paymentMethod,
        paymentStatus: current.paymentStatus,
        totalAmount: current.totalAmount,
        stockReleasedAt: current.stockReleasedAt ?? null,
      },
      {
        status: event.status,
        success: event.success,
        amountMinor: event.amountMinor,
        currency: event.currency,
      },
      env.CURRENCY,
    );

    const ledgerInput: LedgerInput = { orderId: current._id, event };
    const [ledger] = await paymentTransactionModel.create(
      [
        {
          orderId: ledgerInput.orderId,
          orderNumber: event.orderNumber,
          provider: event.provider,
          providerTransactionId: event.providerTransactionId,
          intentionId: event.providerSessionId,
          amountMinor: event.amountMinor,
          currency: event.currency,
          status: event.status,
          success: event.success,
          hmacVerified: event.source === "webhook",
          source: event.source,
          result: decision.result,
          reason: decision.reason,
          payloadDigest: digestPayload(event.payload),
          processedAt: new Date(),
        },
      ],
      { session },
    );

    const shouldChange = decision.nextPaymentStatus !== null || decision.releaseStock;
    if (shouldChange) {
      const now = new Date();
      const setFields: Record<string, unknown> = {};
      const history: IOrderStatusHistoryEntry[] = [];

      if (decision.nextPaymentStatus !== null && decision.nextPaymentStatus !== current.paymentStatus) {
        setFields.paymentStatus = decision.nextPaymentStatus;
        setFields.paymentProvider = event.provider;
        setFields.paymentReference = current.paymentReference || event.providerReference;
        if (event.providerSessionId) {
          setFields.paymentIntentionId = current.paymentIntentionId || event.providerSessionId;
        }
        history.push({
          at: now,
          actor: "system",
          actorId: null,
          field: "paymentStatus",
          from: current.paymentStatus,
          to: decision.nextPaymentStatus,
          reason: decision.reason,
        });
      }

      if (decision.releaseStock) {
        setFields.stockReleasedAt = now;
        history.push({
          at: now,
          actor: "system",
          actorId: null,
          field: "orderStatus",
          from: current.orderStatus,
          to: current.orderStatus,
          reason: "Stock hold released after payment failure",
        });
      }

      const guards: Record<string, unknown> = {
        _id: current._id,
        paymentStatus: current.paymentStatus,
        stockReleasedAt: current.stockReleasedAt ?? null,
      };

      const update: Record<string, unknown> = {
        $set: setFields,
        $push: { paymentAttempts: ledger._id },
      };
      if (history.length > 0) {
        (update.$push as Record<string, unknown>).statusHistory = { $each: history };
      }

      const updated = await orderModel.findOneAndUpdate(guards, update, { new: true, session });
      if (!updated) {
        throw new HttpError(409, "Order changed while settlement was running. The provider will retry.");
      }

      if (decision.releaseStock) {
        // Inside the same transaction: if a product/variant disappeared, the
        // whole settlement aborts instead of losing inventory.
        await releaseStock(collectStockRequirements(parseOrderItems(updated.items)), session);
      }
    } else {
      await orderModel.updateOne({ _id: current._id }, { $push: { paymentAttempts: ledger._id } }).session(session);
    }

    await session.commitTransaction();
    outcome = {
      result: decision.result,
      changed: shouldChange,
      orderId: String(current._id),
      reason: decision.reason,
    };
  } catch (error) {
    await session.abortTransaction();

    if (isDuplicateKey(error)) {
      // A concurrent or retried delivery already owns this transaction id.
      return {
        result: "duplicate",
        changed: false,
        orderId: String(order._id),
        reason: "Duplicate provider event",
      };
    }

    throw error;
  } finally {
    await session.endSession();
  }

  return outcome;
};

/** True when a ledger row already exists (used by tests and diagnostics). */
export const hasLedgerEntry = async (provider: string, providerTransactionId: string): Promise<boolean> =>
  Boolean(await paymentTransactionModel.exists({ provider, providerTransactionId }));
