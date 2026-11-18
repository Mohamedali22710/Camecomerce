import { describe, expect, it } from "@jest/globals";

import { env } from "../../../config/env.service.js";

import { isStripePaymentSettledForOrder } from "./stripe.service.js";

const order = { paymentMethod: "card", totalAmount: 123.45 };
const paidSession = {
  payment_status: "paid",
  amount_total: 12345,
  currency: env.CURRENCY,
};

describe("isStripePaymentSettledForOrder", () => {
  it("accepts a paid session whose amount and currency match the stored order", () => {
    expect(isStripePaymentSettledForOrder(paidSession, order)).toBe(true);
  });

  it("rejects a completed-but-unpaid session", () => {
    expect(isStripePaymentSettledForOrder({ ...paidSession, payment_status: "unpaid" }, order)).toBe(false);
  });

  it("rejects an amount mismatch, including a 100x error", () => {
    expect(isStripePaymentSettledForOrder({ ...paidSession, amount_total: 123 }, order)).toBe(false);
    expect(isStripePaymentSettledForOrder({ ...paidSession, amount_total: 1234500 }, order)).toBe(false);
  });

  it("rejects a missing amount", () => {
    expect(isStripePaymentSettledForOrder({ ...paidSession, amount_total: null }, order)).toBe(false);
  });

  it("rejects a currency mismatch", () => {
    expect(isStripePaymentSettledForOrder({ ...paidSession, currency: "USD" }, order)).toBe(false);
  });

  it("rejects a non-card order", () => {
    expect(
      isStripePaymentSettledForOrder(paidSession, {
        paymentMethod: "cod",
        totalAmount: 123.45,
      }),
    ).toBe(false);
  });
});
