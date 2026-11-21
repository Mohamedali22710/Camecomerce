/**
 * Database-backed replay and settlement tests (MVP-17 / MVP-23).
 *
 * These tests require a transaction-capable MongoDB replica set. They run only
 * when `MONGO_TEST_URI` is set; otherwise they are skipped with the reason below
 * so the default unit suite stays free of external I/O.
 *
 * Run locally:
 *   $env:MONGO_TEST_URI="mongodb://127.0.0.1:27018/cctv_test?replicaSet=rs0"
 *   npm test -- payment.replay.integration
 */
import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";
import mongoose from "mongoose";

import { env } from "../../../config/env.service.js";
import { orderModel } from "../../database/model/order.model.js";
import { paymentTransactionModel } from "../../database/model/payment.model.js";
import { productModel } from "../../database/model/product.model.js";
import type { OrderLineSnapshot } from "../cart/cart.lines.js";

import { settlePaymentEvent } from "./payment.settlement.js";
import type { PaymentStatus, VerifiedPaymentEvent } from "./payment.types.js";

const testUri = process.env.MONGO_TEST_URI;
const describeWithDatabase = testUri ? describe : describe.skip;
const testDatabase = `cctv_mvp23_replay_${process.pid}`;
const currency = env.CURRENCY;

let sequence = 0;

const createProduct = async (stock: number) => {
  sequence += 1;
  return productModel.create({
    en_name: `Replay camera ${sequence}`,
    en_description: "Database-backed replay fixture",
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
  paymentStatus?: PaymentStatus;
  stockReleasedAt?: Date | null;
}

const createOrder = async ({ productId, quantity = 2, paymentStatus = "pending", stockReleasedAt = null }: OrderFixture) => {
  sequence += 1;
  const lineTotal = 100 * quantity;
  const item: OrderLineSnapshot = {
    itemType: "product",
    productId,
    quantity,
    price: 100,
    lineTotal,
    en_name: `Replay camera ${sequence}`,
    color: "White",
    size: "Default",
  };

  return orderModel.create({
    userId: new mongoose.Types.ObjectId(),
    orderNumber: `CCTV-TEST-${Date.now()}-${sequence}`,
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
      fullName: "Replay Tester",
      phone: "+201000000000",
      street: "Test street",
      city: "Cairo",
      country: "Egypt",
    }),
    statusHistory: [],
    stockReleasedAt,
    paymentAttempts: [],
    expiresAt: null,
  });
};

const createEvent = (
  order: Awaited<ReturnType<typeof createOrder>>,
  overrides: Partial<VerifiedPaymentEvent> = {},
): VerifiedPaymentEvent => ({
  provider: "paymob",
  providerTransactionId: `txn-${order._id}-${Date.now()}-${sequence}`,
  providerReference: order.paymentReference ?? `ref-${order._id}`,
  providerSessionId: null,
  orderNumber: order.orderNumber!,
  status: "paid",
  success: true,
  amountMinor: Math.round(order.totalAmount * 100),
  currency,
  verified: true,
  source: "webhook",
  payload: {},
  ...overrides,
});

describeWithDatabase("payment settlement against MongoDB", () => {
  beforeAll(async () => {
    await mongoose.connect(testUri!, { dbName: testDatabase });
    await mongoose.connection.dropDatabase();
    await Promise.all([orderModel.init(), paymentTransactionModel.init(), productModel.init()]);
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  it("applies a paid callback once and treats the replay as a duplicate", async () => {
    const product = await createProduct(20);
    const order = await createOrder({ productId: String(product._id) });
    const event = createEvent(order, { providerTransactionId: `txn-replay-${order._id}` });

    const first = await settlePaymentEvent(event);
    const second = await settlePaymentEvent(event);

    expect(first).toMatchObject({ result: "applied", changed: true });
    expect(second).toMatchObject({ result: "duplicate", changed: false });

    const fresh = await orderModel.findById(order._id);
    expect(fresh?.paymentStatus).toBe("paid");
    expect(
      await paymentTransactionModel.countDocuments({
        provider: "paymob",
        providerTransactionId: event.providerTransactionId,
      }),
    ).toBe(1);
  });

  it("never marks an order paid when the provider amount does not match", async () => {
    const product = await createProduct(20);
    const order = await createOrder({ productId: String(product._id) });
    const event = createEvent(order, {
      providerTransactionId: `txn-mismatch-${order._id}`,
      amountMinor: Math.round(order.totalAmount * 100) + 1,
    });

    const outcome = await settlePaymentEvent(event);

    expect(outcome.result).toBe("amount_mismatch");
    const fresh = await orderModel.findById(order._id);
    expect(fresh?.paymentStatus).toBe("reconciliation_required");
  });

  it("marks a late payment after stock release as reconciliation_required", async () => {
    const product = await createProduct(20);
    const order = await createOrder({
      productId: String(product._id),
      stockReleasedAt: new Date(),
    });
    const event = createEvent(order, { providerTransactionId: `txn-late-${order._id}` });

    const outcome = await settlePaymentEvent(event);

    expect(outcome.result).toBe("reconciliation_required");
    const fresh = await orderModel.findById(order._id);
    expect(fresh?.paymentStatus).toBe("reconciliation_required");
  });
});
