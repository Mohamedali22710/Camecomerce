import { describe, expect, it } from "@jest/globals";

import { env } from "../../../config/env.service.js";

import { serializeTracking } from "./order.tracking.js";

const order = {
  _id: "507f1f77bcf86cd799439011",
  orderNumber: "CCTV-261119-AB12",
  orderStatus: "processing",
  paymentStatus: "paid",
  shippingStatus: "shipped",
  shippingCarrier: "SMSA",
  trackingNumber: "TRACK-1",
  statusHistory: [
    {
      at: new Date("2026-11-19T12:00:00.000Z"),
      actor: "admin",
      actorId: "secret-admin-id",
      field: "shippingStatus",
      from: "prepared",
      to: "shipped",
      reason: "Private admin note",
    },
    {
      at: new Date("2026-11-19T10:00:00.000Z"),
      actor: "user",
      actorId: "user-id",
      field: "orderStatus",
      from: "none",
      to: "pending",
      reason: "Order created",
    },
  ],
} as Parameters<typeof serializeTracking>[0];

describe("serializeTracking", () => {
  it("returns status, carrier, tracking number, and a chronological timeline", () => {
    const tracking = serializeTracking(order);

    expect(tracking).toMatchObject({
      orderNumber: "CCTV-261119-AB12",
      orderStatus: "processing",
      paymentStatus: "paid",
      shippingStatus: "shipped",
      shippingCarrier: "SMSA",
      trackingNumber: "TRACK-1",
      estimatedDelivery: null,
      currency: env.CURRENCY,
    });
    expect(tracking.events.map((event) => event.to)).toEqual(["pending", "shipped"]);
  });

  it("never exposes actor ids, reasons, provider refs, or admin notes", () => {
    const serialized = JSON.stringify(serializeTracking(order));

    expect(serialized).not.toContain("secret-admin-id");
    expect(serialized).not.toContain("Private admin note");
    expect(serialized).not.toContain("paymentReference");
    expect(serialized).not.toContain("paymentProvider");
  });

  it("returns nulls for an order without shipping information", () => {
    const tracking = serializeTracking({ ...order, shippingCarrier: null, trackingNumber: null });
    expect(tracking.shippingCarrier).toBeNull();
    expect(tracking.trackingNumber).toBeNull();
  });
});
