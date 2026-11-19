import { describe, expect, it } from "@jest/globals";

import { decidePaymentSettlement, PaymentEventFacts, PaymentOrderSnapshot } from "./payment.events.js";

const order = (overrides: Partial<PaymentOrderSnapshot> = {}): PaymentOrderSnapshot => ({
  paymentMethod: "card",
  paymentStatus: "pending",
  totalAmount: 1250,
  stockReleasedAt: null,
  ...overrides,
});

const event = (overrides: Partial<PaymentEventFacts> = {}): PaymentEventFacts => ({
  status: "paid",
  success: true,
  amountMinor: 125_000,
  currency: "SAR",
  ...overrides,
});

describe("decidePaymentSettlement", () => {
  it("marks a matching successful payment as paid without touching stock", () => {
    const decision = decidePaymentSettlement(order(), event(), "SAR");

    expect(decision).toMatchObject({ result: "applied", nextPaymentStatus: "paid", releaseStock: false });
  });

  it("ignores events for non-card orders", () => {
    expect(decidePaymentSettlement(order({ paymentMethod: "cod" }), event(), "SAR")).toMatchObject({
      result: "ignored",
      nextPaymentStatus: null,
    });
  });

  it("never downgrades an already paid order", () => {
    expect(
      decidePaymentSettlement(order({ paymentStatus: "paid" }), event({ status: "failed", success: false }), "SAR"),
    ).toMatchObject({ result: "ignored", nextPaymentStatus: null });

    expect(decidePaymentSettlement(order({ paymentStatus: "paid" }), event(), "SAR")).toMatchObject({
      result: "duplicate",
      nextPaymentStatus: null,
    });
  });

  it("turns an amount mismatch into reconciliation_required, never paid", () => {
    expect(decidePaymentSettlement(order(), event({ amountMinor: 1 }), "SAR")).toMatchObject({
      result: "amount_mismatch",
      nextPaymentStatus: "reconciliation_required",
      releaseStock: false,
    });
  });

  it("turns a currency mismatch into reconciliation_required", () => {
    expect(decidePaymentSettlement(order(), event({ currency: "EGP" }), "SAR")).toMatchObject({
      result: "currency_mismatch",
      nextPaymentStatus: "reconciliation_required",
    });
  });

  it("does not mark paid when stock was already released (late payment)", () => {
    const decision = decidePaymentSettlement(order({ stockReleasedAt: new Date() }), event(), "SAR");

    expect(decision).toMatchObject({
      result: "reconciliation_required",
      nextPaymentStatus: "reconciliation_required",
      releaseStock: false,
    });
  });

  it("leaves a pending event pending", () => {
    expect(decidePaymentSettlement(order(), event({ status: "pending", success: false }), "SAR")).toMatchObject({
      result: "pending",
      nextPaymentStatus: null,
    });
  });

  it("releases stock once for a failed unpaid order", () => {
    expect(decidePaymentSettlement(order(), event({ status: "failed", success: false }), "SAR")).toMatchObject({
      result: "applied",
      nextPaymentStatus: "failed",
      releaseStock: true,
    });
  });

  it("releases stock for a provider cancellation", () => {
    expect(
      decidePaymentSettlement(order(), event({ status: "cancelled", success: false }), "SAR"),
    ).toMatchObject({ nextPaymentStatus: "cancelled", releaseStock: true });
  });

  it("never downgrades paid on a late failure callback", () => {
    expect(
      decidePaymentSettlement(
        order({ paymentStatus: "paid" }),
        event({ status: "failed", success: false }),
        "SAR",
      ),
    ).toMatchObject({ result: "ignored", releaseStock: false });
  });

  it("ignores a failure after the stock was already released", () => {
    expect(
      decidePaymentSettlement(
        order({ stockReleasedAt: new Date() }),
        event({ status: "failed", success: false }),
        "SAR",
      ),
    ).toMatchObject({ result: "ignored", releaseStock: false });
  });

  it("does not release stock for a failed event with a mismatched amount", () => {
    expect(
      decidePaymentSettlement(
        order(),
        event({ status: "failed", success: false, amountMinor: 1 }),
        "SAR",
      ),
    ).toMatchObject({ result: "amount_mismatch", nextPaymentStatus: null, releaseStock: false });
  });
});
