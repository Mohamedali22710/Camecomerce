import { describe, expect, it } from "@jest/globals";

import { isOrderExpired } from "./order.expiry.js";

const now = new Date("2026-11-19T10:00:00.000Z");

const facts = (overrides: Partial<Parameters<typeof isOrderExpired>[0]> = {}) => ({
  paymentMethod: "card",
  paymentStatus: "pending",
  stockReleasedAt: null,
  expiresAt: new Date("2026-11-19T09:59:59.000Z"),
  createdAt: new Date("2026-11-19T09:00:00.000Z"),
  ...overrides,
});

describe("isOrderExpired", () => {
  it("expires an unpaid card order whose deadline passed", () => {
    expect(isOrderExpired(facts(), now, 30)).toBe(true);
  });

  it("does not expire before the deadline", () => {
    expect(isOrderExpired(facts({ expiresAt: new Date("2026-11-19T10:00:01.000Z") }), now, 30)).toBe(false);
  });

  it("never expires a paid, cancelled, or already-released order", () => {
    expect(isOrderExpired(facts({ paymentStatus: "paid" }), now, 30)).toBe(false);
    expect(isOrderExpired(facts({ paymentStatus: "cancelled" }), now, 30)).toBe(false);
    expect(isOrderExpired(facts({ stockReleasedAt: new Date() }), now, 30)).toBe(false);
  });

  it("never expires a COD order", () => {
    expect(isOrderExpired(facts({ paymentMethod: "cod" }), now, 30)).toBe(false);
  });

  it("falls back to createdAt + TTL for legacy card orders", () => {
    const legacy = facts({ expiresAt: null, createdAt: new Date("2026-11-19T09:00:00.000Z") });
    expect(isOrderExpired(legacy, now, 30)).toBe(true);
    expect(isOrderExpired(legacy, new Date("2026-11-19T09:10:00.000Z"), 30)).toBe(false);
  });

  it("treats an order with no deadline and no createdAt as not expired", () => {
    expect(isOrderExpired(facts({ expiresAt: null, createdAt: null }), now, 30)).toBe(false);
  });
});
