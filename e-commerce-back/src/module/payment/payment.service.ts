/** Payment status (MVP-14).
 *
 * Reports only the status stored on the order. Return-URL query parameters are
 * ignored and can never change a payment status. The authoritative provider
 * inquiry (MVP-18) is not implemented yet, so a pending card payment stays
 * pending here and the limitation is documented in the blockers file.
 */
import { Request, Response } from "express";

import { env } from "../../../config/env.service.js";
import { HttpError } from "../../common/utils/httpError.js";
import { orderModel } from "../../database/model/order.model.js";
import { legacyOrderNumber } from "../order/order.number.js";

export type PaymentNextAction = "none" | "complete_payment" | "await_confirmation" | "contact_support";

const nextActionFor = (paymentStatus: string, paymentMethod: string): PaymentNextAction => {
  if (paymentStatus === "paid") {
    return "none";
  }
  if (paymentStatus === "failed") {
    return "contact_support";
  }
  return paymentMethod === "card" ? "complete_payment" : "await_confirmation";
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
  const order = await orderModel.findOne({ orderNumber });
  if (!order) {
    throw new HttpError(404, "Order not found");
  }

  const isAdmin = req.bearer === "admin" || req.bearer === "superAdmin";
  if (String(order.userId) !== userId && !isAdmin) {
    throw new HttpError(404, "Order not found");
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
