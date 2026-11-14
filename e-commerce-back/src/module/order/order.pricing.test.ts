import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateOrderTotals,
  calculateShipping,
  discountedUnitPrice,
  roundMoney,
} from "../../common/utils/pricing.js";

test("roundMoney rounds to two decimals", () => {
  assert.equal(roundMoney(10.015), 10.02);
  assert.equal(roundMoney(10.004), 10);
  assert.equal(roundMoney(0.1 + 0.2), 0.3);
});

test("discountedUnitPrice applies percentage discounts", () => {
  assert.equal(discountedUnitPrice(200, 25), 150);
  assert.equal(discountedUnitPrice(99.99, 10), 89.99);
});

test("discountedUnitPrice clamps invalid discounts", () => {
  assert.equal(discountedUnitPrice(100, -5), 100);
  assert.equal(discountedUnitPrice(100, 150), 0);
  assert.equal(discountedUnitPrice(100), 100);
});

test("calculateShipping supports fixed and percentage modes", () => {
  assert.equal(calculateShipping(1000, { type: "fixed", value: 50 }), 50);
  assert.equal(calculateShipping(1000, { type: "percentage", value: 10 }), 100);
  assert.equal(calculateShipping(1000, { type: "fixed", value: 0 }), 0);
});

test("calculateOrderTotals combines discounted items and shipping", () => {
  const totals = calculateOrderTotals(
    [
      { price: 200, discount: 25, quantity: 2 },
      { price: 50, quantity: 1 },
    ],
    { type: "fixed", value: 30 },
  );

  assert.deepEqual(totals, { subtotal: 350, shippingCost: 30, total: 380 });
});

test("calculateOrderTotals keeps sub-cent amounts stable", () => {
  const totals = calculateOrderTotals(
    [{ price: 19.99, discount: 5, quantity: 3 }],
    { type: "percentage", value: 7.5 },
  );

  assert.equal(totals.subtotal, 56.97);
  assert.equal(totals.shippingCost, 4.27);
  assert.equal(totals.total, 61.24);
});
