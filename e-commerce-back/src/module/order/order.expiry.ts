/** Card-order expiry (MVP-19).
 *
 * An unpaid card order holds stock. When its deadline passes, the hold is
 * released exactly once, guarded by `stockReleasedAt` inside a transaction. A
 * cron is intentionally out of scope: expiry runs lazily when the order (or its
 * payment status) is read, and through an admin-triggered sweep endpoint.
 */
import mongoose from "mongoose";

import { env } from "../../../config/env.service.js";
import { IOrder, IOrderStatusHistoryEntry, orderModel } from "../../database/model/order.model.js";

import { collectStockRequirements, parseOrderItems, releaseStock } from "./order.stock.js";

const TTL_MS = 60_000;

/** Facts needed to decide expiry; pure so the boundary cases are unit-tested. */
export interface ExpiryFacts {
  paymentMethod: string;
  paymentStatus: string;
  stockReleasedAt?: Date | null;
  expiresAt?: Date | null;
  createdAt?: Date | null;
}

/**
 * True only for a payable card order whose deadline passed. Paid, cancelled,
 * already-released, and COD orders are never expired.
 */
export const isOrderExpired = (
  order: ExpiryFacts,
  now: Date = new Date(),
  ttlMinutes: number = env.PAYMENT_ORDER_TTL_MINUTES,
): boolean => {
  if (order.paymentMethod !== "card" || order.paymentStatus !== "pending" || order.stockReleasedAt) {
    return false;
  }

  const deadline =
    order.expiresAt ?? (order.createdAt ? new Date(order.createdAt.getTime() + ttlMinutes * TTL_MS) : null);
  return deadline !== null && deadline.getTime() <= now.getTime();
};

/**
 * Expires one order and releases its hold. Returns false when another request
 * already claimed the release (or the order no longer qualifies).
 */
export const expireOrderById = async (orderId: string, now: Date = new Date()): Promise<boolean> => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const order = await orderModel.findById(orderId).session(session);
    if (!order || !isOrderExpired(order, now)) {
      await session.abortTransaction();
      return false;
    }

    const history: IOrderStatusHistoryEntry[] = [
      {
        at: now,
        actor: "system",
        actorId: null,
        field: "paymentStatus",
        from: order.paymentStatus,
        to: "expired",
        reason: "Payment window elapsed; stock hold released",
      },
    ];

    const updated = await orderModel.findOneAndUpdate(
      // The guard makes the release one-time even under concurrent reads.
      { _id: order._id, paymentStatus: "pending", stockReleasedAt: null },
      {
        $set: { paymentStatus: "expired", stockReleasedAt: now },
        $push: { statusHistory: { $each: history } },
      },
      { new: true, session },
    );

    if (!updated) {
      await session.abortTransaction();
      return false;
    }

    await releaseStock(collectStockRequirements(parseOrderItems(updated.items)), session);
    await session.commitTransaction();
    return true;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
};

/** Lazy expiry for a single read. Never throws for a non-eligible order. */
export const expireOrderIfNeeded = async (order: IOrder, now: Date = new Date()): Promise<boolean> => {
  if (!isOrderExpired(order, now)) {
    return false;
  }
  return expireOrderById(String(order._id), now);
};

export interface ExpirySweepResult {
  scanned: number;
  expired: number;
}

/**
 * Admin sweep. Bounded so one request cannot hold the event loop for minutes;
 * repeat the call until `scanned` is below the limit.
 */
export const expireStaleOrders = async (
  limit = 50,
  now: Date = new Date(),
): Promise<ExpirySweepResult> => {
  const cutoff = new Date(now.getTime() - env.PAYMENT_ORDER_TTL_MINUTES * TTL_MS);
  const candidates = await orderModel
    .find({
      paymentMethod: "card",
      paymentStatus: "pending",
      stockReleasedAt: null,
      $or: [{ expiresAt: { $lte: now } }, { expiresAt: null, createdAt: { $lte: cutoff } }],
    })
    .select("_id")
    .sort({ expiresAt: 1 })
    .limit(Math.min(200, Math.max(1, limit)));

  let expired = 0;
  for (const candidate of candidates) {
    if (await expireOrderById(String(candidate._id), now)) {
      expired += 1;
    }
  }

  return { scanned: candidates.length, expired };
};
