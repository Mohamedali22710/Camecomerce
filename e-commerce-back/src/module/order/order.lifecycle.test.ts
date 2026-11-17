import { describe, expect, it } from "@jest/globals";

import { HttpError } from "../../common/utils/httpError.js";

import { initialOrderHistory, planOrderStatusUpdate, StatusHistoryEntry } from "./order.lifecycle.js";

const baseOrder = {
  orderStatus: "pending" as const,
  paymentStatus: "pending" as const,
  shippingStatus: "pending" as const,
  stockReleasedAt: null,
};

const actor = { role: "admin", userId: "507f1f77bcf86cd799439011" };
const now = new Date("2026-11-17T10:00:00.000Z");

const changeFor = (changes: StatusHistoryEntry[], field: string) => changes.find((change) => change.field === field);

describe("planOrderStatusUpdate", () => {
  it("records an audited transition with actor, timestamp, and reason", () => {
    const plan = planOrderStatusUpdate(baseOrder, { orderStatus: "processing", reason: "Packed" }, actor, now);

    expect(plan.releaseStock).toBe(false);
    expect(plan.changes).toEqual([
      {
        at: now,
        actor: "admin",
        actorId: actor.userId,
        field: "orderStatus",
        from: "pending",
        to: "processing",
        reason: "Packed",
      },
    ]);
  });

  it("requires a reason when an admin marks an order paid", () => {
    expect(() => planOrderStatusUpdate(baseOrder, { paymentStatus: "paid" }, actor, now)).toThrow(
      "A reason is required",
    );

    const plan = planOrderStatusUpdate(
      baseOrder,
      { paymentStatus: "paid", reason: "Bank transfer confirmed" },
      actor,
      now,
    );
    expect(changeFor(plan.changes, "paymentStatus")).toMatchObject({
      from: "pending",
      to: "paid",
      reason: "Bank transfer confirmed",
    });
  });

  it("never downgrades a paid order", () => {
    expect(() =>
      planOrderStatusUpdate(
        { ...baseOrder, paymentStatus: "paid" },
        { paymentStatus: "failed", reason: "Late callback" },
        actor,
        now,
      ),
    ).toThrow(/Illegal paymentStatus transition/);
  });

  it("treats cancelled and delivered as terminal order states", () => {
    expect(() =>
      planOrderStatusUpdate({ ...baseOrder, orderStatus: "cancelled" }, { orderStatus: "pending" }, actor, now),
    ).toThrow(/Illegal orderStatus transition/);

    expect(() =>
      planOrderStatusUpdate({ ...baseOrder, orderStatus: "delivered" }, { orderStatus: "processing" }, actor, now),
    ).toThrow(/Illegal orderStatus transition/);
  });

  it("rejects an illegal shipping transition", () => {
    expect(() =>
      planOrderStatusUpdate({ ...baseOrder, shippingStatus: "delivered" }, { shippingStatus: "pending" }, actor, now),
    ).toThrow(/Illegal shippingStatus transition/);
  });

  it("allows a failed payment to be confirmed paid later", () => {
    const plan = planOrderStatusUpdate(
      { ...baseOrder, paymentStatus: "failed" },
      { paymentStatus: "paid", reason: "Provider confirmed settlement" },
      actor,
      now,
    );
    expect(changeFor(plan.changes, "paymentStatus")?.to).toBe("paid");
  });

  it("keeps payment and shipping transitions independent of fulfilment", () => {
    const plan = planOrderStatusUpdate(
      baseOrder,
      { orderStatus: "processing", shippingStatus: "prepared" },
      actor,
      now,
    );
    expect(plan.changes.map((change) => change.field)).toEqual(["orderStatus", "shippingStatus"]);
  });

  it("requests stock release only on the first transition into cancelled", () => {
    const first = planOrderStatusUpdate(baseOrder, { orderStatus: "cancelled" }, actor, now);
    expect(first.releaseStock).toBe(true);

    const alreadyReleased = planOrderStatusUpdate(
      { ...baseOrder, stockReleasedAt: now },
      { orderStatus: "cancelled" },
      actor,
      now,
    );
    expect(alreadyReleased.releaseStock).toBe(false);

    const alreadyCancelled = planOrderStatusUpdate(
      { ...baseOrder, orderStatus: "cancelled" },
      { orderStatus: "cancelled" },
      actor,
      now,
    );
    expect(alreadyCancelled.changes).toEqual([]);
    expect(alreadyCancelled.releaseStock).toBe(false);
  });

  it("returns no changes when the submitted statuses already match", () => {
    const plan = planOrderStatusUpdate(baseOrder, { orderStatus: "pending", paymentStatus: "pending" }, actor, now);
    expect(plan.changes).toEqual([]);
  });

  it("throws an HttpError so the API returns 400, not 500", () => {
    expect(() =>
      planOrderStatusUpdate({ ...baseOrder, paymentStatus: "paid" }, { paymentStatus: "pending" }, actor, now),
    ).toThrow(HttpError);
  });
});

describe("initialOrderHistory", () => {
  it("records the order creation event", () => {
    expect(initialOrderHistory(actor.userId, now)).toEqual([
      {
        at: now,
        actor: "user",
        actorId: actor.userId,
        field: "orderStatus",
        from: "none",
        to: "pending",
        reason: "Order created",
      },
    ]);
  });
});
