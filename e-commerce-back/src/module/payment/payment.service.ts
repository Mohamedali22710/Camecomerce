/** Payment status, method discovery, and hosted-session creation (MVP-14/18/20).
 *
 * Return-URL query parameters are ignored and can never change a payment status.
 * Only an HMAC-verified webhook or an authenticated provider inquiry (through
 * the admin sync endpoint) can settle a payment.
 */
import { Request, Response } from "express";

import { env } from "../../../config/env.service.js";
import { HttpError } from "../../common/utils/httpError.js";
import { toMinorUnits } from "../../common/utils/money.js";
import { orderModel } from "../../database/model/order.model.js";
import { expireOrderIfNeeded } from "../order/order.expiry.js";
import { legacyOrderNumber } from "../order/order.number.js";
import { parseOrderItems } from "../order/order.stock.js";

import { assertPaymentMethodEnabled, listEnabledPaymentMethods } from "./payment.methods.js";
import { getPaymentProvider } from "./payment.registry.js";
import type { CreateSessionResult, PaymentMethodCode } from "./payment.types.js";

export type PaymentNextAction = "none" | "complete_payment" | "await_confirmation" | "contact_support";

const nextActionFor = (paymentStatus: string, paymentMethod: string): PaymentNextAction => {
  if (paymentStatus === "paid" || paymentStatus === "cancelled") {
    return "none";
  }
  if (
    paymentStatus === "failed" ||
    paymentStatus === "expired" ||
    paymentStatus === "reconciliation_required"
  ) {
    return "contact_support";
  }
  return paymentMethod === "card" ? "complete_payment" : "await_confirmation";
};

const resolveProvider = () => {
  try {
    return getPaymentProvider();
  } catch (error) {
    console.error("payment provider unavailable:", (error as Error)?.message);
    throw new HttpError(503, "The configured payment provider is unavailable.");
  }
};

/** GET /v1/payment/methods — public, no identifiers or secrets. */
export const getPaymentMethods = async (_req: Request, res: Response): Promise<void> => {
  res.status(200).json({ message: "Payment methods", data: listEnabledPaymentMethods() });
};

/**
 * GET /v1/payment/status/:orderNumber — owner or admin only.
 * Non-owners receive 404 so order existence is not disclosed. The response never
 * includes the provider reference, secrets, or raw provider payloads.
 */
export const getPaymentStatus = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?._id;
  if (!userId) {
    throw new HttpError(401, "Unauthorized");
  }

  const orderNumber = String(req.params.orderNumber ?? "");
  let order = await orderModel.findOne({ orderNumber });
  if (!order) {
    throw new HttpError(404, "Order not found");
  }

  const admin = req.bearer === "admin" || req.bearer === "superAdmin";
  if (String(order.userId) !== userId && !admin) {
    throw new HttpError(404, "Order not found");
  }

  // A redirect or status poll never marks anything paid, but it may release an
  // abandoned stock hold once the payment window has elapsed.
  if (await expireOrderIfNeeded(order)) {
    order = (await orderModel.findById(order._id)) ?? order;
  }

  res.status(200).json({
    message: "Payment status",
    data: {
      orderNumber: order.orderNumber || legacyOrderNumber(String(order._id)),
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      currency: env.CURRENCY,
      nextAction: nextActionFor(order.paymentStatus, order.paymentMethod),
    },
  });
};

/**
 * POST /v1/payment/session — creates (or retries) a hosted checkout for a
 * persisted pending card order. Amounts always come from the stored order.
 */
export const createPaymentSession = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?._id;
  if (!userId) {
    throw new HttpError(401, "Unauthorized");
  }

  const body = req.body as { orderNumber: string; method?: string };
  const order = await orderModel.findOne({ orderNumber: String(body.orderNumber ?? "") });
  if (!order) {
    throw new HttpError(404, "Order not found");
  }

  const admin = req.bearer === "admin" || req.bearer === "superAdmin";
  if (String(order.userId) !== userId && !admin) {
    throw new HttpError(404, "Order not found");
  }
  if (order.paymentMethod !== "card") {
    throw new HttpError(409, "This order does not use an online payment session");
  }

  if (await expireOrderIfNeeded(order)) {
    throw new HttpError(409, "This order's payment window has elapsed. Create a new order.");
  }
  if (order.paymentStatus !== "pending") {
    throw new HttpError(409, `Payment is already ${order.paymentStatus} and cannot be restarted`);
  }
  if (order.stockReleasedAt) {
    throw new HttpError(409, "The stock hold for this order was released. Create a new order.");
  }

  const method: PaymentMethodCode = assertPaymentMethodEnabled(body.method ?? "card");
  const provider = resolveProvider();
  const lines = parseOrderItems(order.items);

  let checkout: CreateSessionResult;
  try {
    checkout = await provider.createSession({
      orderId: String(order._id),
      orderNumber: order.orderNumber || legacyOrderNumber(String(order._id)),
      amountMinor: toMinorUnits(order.totalAmount),
      shippingMinor: toMinorUnits(order.shippingCost),
      currency: env.CURRENCY,
      method,
      items: lines.map((line) => ({
        name: line.en_name,
        quantity: line.quantity,
        unitAmountMinor: toMinorUnits(line.itemType === "bundle" ? line.unitPrice : line.price),
        sku: line.itemType === "bundle" ? `bundle:${line.bundleId}` : `product:${line.productId}`,
      })),
      notificationUrl: `${env.base_url}/v1/payment/paymob/webhook`,
      redirectionUrl: `${env.frontendUrl}/checkout/success?orderId=${encodeURIComponent(String(order._id))}`,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
    throw new HttpError(502, "Failed to create payment session");
  }

  await orderModel.updateOne(
    { _id: order._id },
    {
      $set: {
        paymentProvider: provider.name,
        paymentReference: checkout.providerReference,
        paymentIntentionId: checkout.providerSessionId,
      },
    },
  );

  res.status(200).json({
    message: "Redirect to payment",
    data: {
      orderId: String(order._id),
      orderNumber: order.orderNumber || legacyOrderNumber(String(order._id)),
      paymentStatus: checkout.paymentStatus,
      redirectUrl: checkout.redirectUrl,
      provider: checkout.provider,
    },
  });
};
