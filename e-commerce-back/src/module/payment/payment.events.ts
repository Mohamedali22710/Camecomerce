/** Pure settlement decisions for verified payment events (MVP-17/MVP-19).
 *
 * The webhook and the inquiry path both feed this function, so a callback and a
 * pull-based confirmation can never disagree about the rules. Keeping the
 * decision pure makes every branch testable without MongoDB.
 *
 * Invariants:
 * - only a card order can become paid;
 * - the provider amount and currency must match the persisted order;
 * - `paid` is never downgraded;
 * - money that arrives after the stock hold was released becomes
 *   `reconciliation_required`, never `paid`;
 * - stock is released only for a non-success event on an order that has not
 *   released it yet.
 */
import { toMinorUnits } from "../../common/utils/money.js";

import type { PaymentProcessingResult, PaymentStatus } from "./payment.types.js";

export interface PaymentOrderSnapshot {
  paymentMethod: string;
  paymentStatus: PaymentStatus;
  totalAmount: number;
  stockReleasedAt: Date | null;
}

export interface PaymentEventFacts {
  status: PaymentStatus;
  success: boolean;
  amountMinor: number;
  currency: string;
}

export interface SettlementDecision {
  result: PaymentProcessingResult;
  /** Null means the order payment status must not change. */
  nextPaymentStatus: PaymentStatus | null;
  /** True when the caller must release the stock hold in the same transaction. */
  releaseStock: boolean;
  /** Human-readable reason persisted on the ledger row. */
  reason: string;
}

const unchanged = (result: PaymentProcessingResult, reason: string): SettlementDecision => ({
  result,
  nextPaymentStatus: null,
  releaseStock: false,
  reason,
});

const transition = (
  result: PaymentProcessingResult,
  nextPaymentStatus: PaymentStatus,
  reason: string,
  releaseStock = false,
): SettlementDecision => ({
  result,
  nextPaymentStatus,
  releaseStock,
  reason,
});

const isNonSuccessTerminal = (status: PaymentStatus): boolean =>
  status === "failed" || status === "cancelled" || status === "expired";

/**
 * Decides what one provider event means for one persisted order.
 * @param order persisted order facts (never client input)
 * @param event verified provider facts
 * @param expectedCurrency store currency (for example `SAR`)
 */
export const decidePaymentSettlement = (
  order: PaymentOrderSnapshot,
  event: PaymentEventFacts,
  expectedCurrency: string,
): SettlementDecision => {
  if (order.paymentMethod !== "card") {
    return unchanged("ignored", "Order is not a card order");
  }

  const currency = (event.currency || "").trim().toUpperCase();
  if (currency !== expectedCurrency.trim().toUpperCase()) {
    // A successful event with the wrong currency means real money may have been
    // taken outside the expected flow: surface it for a human, never mark paid.
    if (event.success || event.status === "paid") {
      if (order.paymentStatus === "paid") {
        return unchanged("duplicate", "Order is already paid");
      }
      return transition(
        "currency_mismatch",
        "reconciliation_required",
        `Currency mismatch: provider sent ${event.currency}, order uses ${expectedCurrency}`,
      );
    }
    return unchanged("currency_mismatch", `Currency mismatch: provider sent ${event.currency}`);
  }

  const expectedAmountMinor = toMinorUnits(order.totalAmount);
  if (event.amountMinor !== expectedAmountMinor) {
    if (event.success || event.status === "paid") {
      return order.paymentStatus === "paid"
        ? unchanged("duplicate", "Order is already paid")
        : transition(
            "amount_mismatch",
            "reconciliation_required",
            `Amount mismatch: provider sent ${event.amountMinor}, order expects ${expectedAmountMinor}`,
          );
    }
    return unchanged("amount_mismatch", `Amount mismatch: provider sent ${event.amountMinor}`);
  }

  if (event.status === "paid" || (event.success && event.status !== "pending")) {
    if (order.paymentStatus === "paid") {
      return unchanged("duplicate", "Order is already paid");
    }
    if (order.stockReleasedAt) {
      return transition(
        "reconciliation_required",
        "reconciliation_required",
        "Payment succeeded after the stock hold was released; manual reconciliation required",
      );
    }
    return transition("applied", "paid", "Provider confirmed successful payment");
  }

  if (event.status === "pending") {
    return unchanged("pending", "Provider reports the payment as pending");
  }

  if (isNonSuccessTerminal(event.status)) {
    if (order.paymentStatus === "paid") {
      return unchanged("ignored", "A paid order is never downgraded");
    }
    if (order.paymentStatus === "reconciliation_required") {
      return unchanged("ignored", "Order is awaiting manual reconciliation");
    }
    if (order.paymentStatus === "cancelled") {
      return unchanged("ignored", "Order payment is already closed");
    }
    if (order.stockReleasedAt) {
      return unchanged("ignored", "Stock was already released for this order");
    }
    return transition(
      "applied",
      event.status,
      `Provider reported ${event.status}; releasing the stock hold`,
      true,
    );
  }

  // `reconciliation_required` from a provider is not a documented state. Record
  // it but leave the local decision to an admin.
  if (event.status === "reconciliation_required") {
    return order.paymentStatus === "paid"
      ? unchanged("duplicate", "Order is already paid")
      : transition("reconciliation_required", "reconciliation_required", "Provider requested reconciliation");
  }

  return unchanged("ignored", "Unsupported provider state");
};
