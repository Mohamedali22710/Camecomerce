/** Order routes: create order, list orders, admin status updates, payment webhook. */
import express, { Request, Response, Router } from "express";

import { auth } from "../../common/middleware/auth.js";
import { allowRoles } from "../../common/utils/allowRoles.js";
import { rateLimiter } from "../../common/utils/rateLimit.js";
import { validateInput, validateParams } from "../../common/utils/validate.js";

import { createOrder, getAllOrders, getMyOrders, getOrderById, updateOrderStatus } from "./order.service.js";
import { createOrderValidate, orderIdParamsValidate, updateOrderStatusValidate } from "./order.validate.js";
import { handleWebhook } from "./stripe.service.js";

const router = Router();

/** Customer routes. */
router.post("/", rateLimiter(60, 20), auth, validateInput(createOrderValidate), createOrder);
router.get("/mine", auth, getMyOrders);

/** Admin routes — must be registered BEFORE /:id to avoid route conflicts. */
router.get("/admin", auth, allowRoles("admin", "superAdmin"), getAllOrders);
router.patch(
  "/admin/:id",
  auth,
  allowRoles("admin", "superAdmin"),
  validateParams(orderIdParamsValidate),
  validateInput(updateOrderStatusValidate),
  updateOrderStatus,
);

/** Owner/admin route — must be after /admin routes. */
router.get("/:id", auth, validateParams(orderIdParamsValidate), getOrderById);

/**
 * @desc Payment provider webhook. The raw body parser is required so the
 * signature can be verified; the handler updates payment fields only.
 * @access Public (verified by provider signature)
 */
const paymentWebhookHandler = async (req: Request, res: Response): Promise<void> => {
  const signature = req.headers["stripe-signature"];
  if (typeof signature !== "string" || !signature) {
    res.status(400).json({ message: "Missing stripe-signature header" });
    return;
  }

  const body = Buffer.isBuffer(req.body) ? req.body : Buffer.from("");
  const result = await handleWebhook(body, signature);

  if (!result.received) {
    res.status(400).json({ message: "Webhook error", error: result.error });
    return;
  }

  res.status(200).json({ received: true });
};

/** Raw-body webhook router, mounted before the JSON parser in app.controller. */
export const webhookRouter = Router();
webhookRouter.post("/", express.raw({ type: "application/json" }), paymentWebhookHandler);

export default router;
