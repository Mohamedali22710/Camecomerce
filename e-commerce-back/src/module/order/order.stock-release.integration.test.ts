/**
 * Database-backed stock-release tests (MVP-19 / MVP-23).
 *
 * These tests prove the one-time release guard against a real MongoDB unique
 * index and transaction, not a mocked model. They run only when
 * `MONGO_TEST_URI` points at a replica set; otherwise they are skipped with the
 * reason in the file header.
 *
 * Run locally:
 *   $env:MONGO_TEST_URI="mongodb://127.0.0.1:27018/cctv_test?replicaSet=rs0"
 *   npm test -- order.stock-release.integration
 */
import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";
import type { Request, Response } from "express";
import mongoose from "mongoose";

import { env } from "../../../config/env.service.js";
import { orderModel } from "../../database/model/order.model.js";
import { paymentTransactionModel } from "../../database/model/payment.model.js";
import { productModel } from "../../database/model/product.model.js";
import type { OrderLineSnapshot } from "../cart/cart.lines.js";
import { settlePaymentEvent } from "../payment/payment.settlement.js";
import type { VerifiedPaymentEvent } from "../payment/payment.types.js";

import { expireOrderById } from "./order.expiry.js";
import { updateOrderStatus } from "./order.service.js";

const testUri = process.env.MONGO_TEST_URI;
const describeWithDatabase = testUri ? describe : describe.skip;
const testDatabase = `cctv_mvp23_stock_${process.pid}`;
const currency = env.CURRENCY;
const adminId = new mongoose.Types.ObjectId().toString();

let sequence = 0;

const createProduct = async (stock: number) => {
  sequence += 1;
  return productModel.create({
    en_name: `Stock camera ${sequence}`,
    en_description: "Database-backed stock fixture",
    price: 100,
    discount: 0,
    variants: JSON.stringify([{ color: "White", size: "Default", stock }]),
    subcategoryId: new mongoose.Types.ObjectId(),
    addedByEmail: "integration@test",
    isActive: true,
  });
};

interface OrderFixture {
  productId: string;
  quantity?: number;
  paymentStatus?: "pending" | "paid";
  expiresAt?: Date | null;
}

const createOrder = async ({ productId, quantity = 2, paymentStatus = "pending", expiresAt = null }: OrderFixture) => {
  sequence += 1;
  const lineTotal = 100 * quantity;
  const item: OrderLineSnapshot = {
    itemType: "product",
    productId,
    quantity,
    price: 100,
    lineTotal,
    en_name: `Stock camera ${sequence}`,
    color: "White",
    size: "Default",
  };

  return orderModel.create({
    userId: new mongoose.Types.ObjectId(),
    orderNumber: `CCTV-STOCK-${Date.now()}-${sequence}`,
    items: JSON.stringify([item]),
    subtotal: lineTotal,
    shippingCost: 0,
    totalAmount: lineTotal,
    paymentMethod: "card",
    paymentStatus,
    paymentProvider: "paymob",
    paymentReference: `ref-${sequence}`,
    orderStatus: "pending",
    shippingStatus: "pending",
    shippingAddress: JSON.stringify({
      fullName: "Stock Tester",
      phone: "+201000000000",
      street: "Test street",
      city: "Cairo",
      country: "Egypt",
    }),
    statusHistory: [],
    stockReleasedAt: null,
    paymentAttempts: [],
    expiresAt,
  });
};

const readStock = async (productId: string): Promise<number> => {
  const product = await productModel.findById(productId);
  const variants = JSON.parse(product?.variants ?? "[]") as Array<{ stock: number }>;
  return variants[0]?.stock ?? -1;
};

const adminRequest = (orderId: string, body: Record<string, unknown>): Request =>
  ({
    params: { id: orderId },
    body,
    bearer: "admin",
    user: { _id: adminId, role: "admin" },
  }) as unknown as Request;

const createResponse = () => {
  const state: { status?: number; body?: unknown } = {};
  const response = {
    status(code: number) {
      state.status = code;
      return response;
    },
    json(body: unknown) {
      state.body = body;
      return response;
    },
  };
  return { response: response as unknown as Response, state };
};

const failureEvent = (
  order: Awaited<ReturnType<typeof createOrder>>,
  providerTransactionId: string,
): VerifiedPaymentEvent => ({
  provider: "paymob",
  providerTransactionId,
  providerReference: order.paymentReference ?? `ref-${order._id}`,
  providerSessionId: null,
  orderNumber: order.orderNumber!,
  status: "failed",
  success: false,
  amountMinor: Math.round(order.totalAmount * 100),
  currency,
  verified: true,
  source: "webhook",
  payload: {},
});

describeWithDatabase("stock release against MongoDB", () => {
  beforeAll(async () => {
    await mongoose.connect(testUri!, { dbName: testDatabase });
    await mongoose.connection.dropDatabase();
    await Promise.all([orderModel.init(), paymentTransactionModel.init(), productModel.init()]);
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  it("restores component stock exactly once when an admin cancels twice", async () => {
    const product = await createProduct(8);
    const order = await createOrder({ productId: String(product._id) });

    const first = createResponse();
    await updateOrderStatus(adminRequest(String(order._id), { orderStatus: "cancelled", reason: "test cancel" }), first.response);
    expect(first.state.status).toBe(200);
    expect(await readStock(String(product._id))).toBe(10);

    const second = createResponse();
    await updateOrderStatus(adminRequest(String(order._id), { orderStatus: "cancelled", reason: "test cancel" }), second.response);
    expect(second.state.status).toBe(200);
    expect(await readStock(String(product._id))).toBe(10);
  });

  it("never restores stock for a paid order", async () => {
    const product = await createProduct(8);
    const order = await createOrder({ productId: String(product._id), paymentStatus: "paid" });

    const response = createResponse();
    await updateOrderStatus(adminRequest(String(order._id), { orderStatus: "cancelled", reason: "paid cancel" }), response.response);

    expect(await readStock(String(product._id))).toBe(8);
  });

  it("expires an unpaid card order exactly once", async () => {
    const product = await createProduct(8);
    const order = await createOrder({
      productId: String(product._id),
      expiresAt: new Date(Date.now() - 60_000),
    });

    expect(await expireOrderById(String(order._id))).toBe(true);
    expect(await expireOrderById(String(order._id))).toBe(false);
    expect(await readStock(String(product._id))).toBe(10);
  });

  it("releases stock once for a failed payment and ignores the replay", async () => {
    const product = await createProduct(8);
    const order = await createOrder({ productId: String(product._id) });
    const event = failureEvent(order, `txn-failed-${order._id}`);

    const first = await settlePaymentEvent(event);
    const second = await settlePaymentEvent(event);

    expect(first).toMatchObject({ result: "applied", changed: true });
    expect(second).toMatchObject({ result: "duplicate", changed: false });
    expect(await readStock(String(product._id))).toBe(10);
  });
});
