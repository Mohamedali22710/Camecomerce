import { describe, expect, it } from "@jest/globals";

import {
  calculateOrderTotals,
  calculateShipping,
  discountedUnitPrice,
  roundMoney,
} from "../../common/utils/pricing.js";

describe("roundMoney", () => {
  it("rounds to two decimals", () => {
    expect(roundMoney(10.015)).toBe(10.02);
    expect(roundMoney(10.004)).toBe(10);
    expect(roundMoney(0.1 + 0.2)).toBe(0.3);
  });
});

describe("discountedUnitPrice", () => {
  it("applies percentage discounts", () => {
    expect(discountedUnitPrice(200, 25)).toBe(150);
    expect(discountedUnitPrice(99.99, 10)).toBe(89.99);
  });

  it("clamps invalid discounts", () => {
    expect(discountedUnitPrice(100, -5)).toBe(100);
    expect(discountedUnitPrice(100, 150)).toBe(0);
    expect(discountedUnitPrice(100)).toBe(100);
  });
});

describe("calculateShipping", () => {
  it("supports fixed and percentage modes", () => {
    expect(calculateShipping(1000, { type: "fixed", value: 50 })).toBe(50);
    expect(calculateShipping(1000, { type: "percentage", value: 10 })).toBe(100);
    expect(calculateShipping(1000, { type: "fixed", value: 0 })).toBe(0);
  });
});

describe("calculateOrderTotals", () => {
  it("combines discounted items and shipping", () => {
    const totals = calculateOrderTotals(
      [
        { price: 200, discount: 25, quantity: 2 },
        { price: 50, quantity: 1 },
      ],
      { type: "fixed", value: 30 },
    );

    expect(totals).toEqual({ subtotal: 350, shippingCost: 30, total: 380 });
  });

  it("keeps sub-cent amounts stable", () => {
    const totals = calculateOrderTotals(
      [{ price: 19.99, discount: 5, quantity: 3 }],
      { type: "percentage", value: 7.5 },
    );

    expect(totals.subtotal).toBe(56.97);
    expect(totals.shippingCost).toBe(4.27);
    expect(totals.total).toBe(61.24);
  });
});
