/** Order routes: create, list, tracking, admin monitoring, payment sync, and
 * reconciliation. The Paymob webhook lives on the payment router so the raw
 * body parser can be mounted before `express.json`.
 */
import { Router } from "express";

import { auth } from "../../common/middleware/auth.js";
import { allowRoles } from "../../common/utils/allowRoles.js";
import { rateLimiter } from "../../common/utils/rateLimit.js";
import { validateInput, validateParams, validateQuery } from "../../common/utils/validate.js";

import {
  createOrder,
  expireOrdersSweep,
  getAllOrders,
  getMyOrders,
  getOrderById,
  getOrderTracking,
  getOrderTrackingByNumber,
  reconcileOrderPayment,
  syncOrderPayment,
  updateOrderStatus,
} from "./order.service.js";
import {
  createOrderValidate,
  expireSweepValidate,
  orderIdParamsValidate,
  orderListQueryValidate,
  orderNumberParamsValidate,
  reconcilePaymentValidate,
  updateOrderStatusValidate,
} from "./order.validate.js";

const router = Router();

/** Customer routes. */
router.post("/", rateLimiter(60, 20), auth, validateInput(createOrderValidate), createOrder);
router.get("/mine", auth, getMyOrders);

/** Tracking — register before `/:id` so the literal path cannot be captured. */
router.get(
  "/track/:orderNumber",
  auth,
  validateParams(orderNumberParamsValidate),
  getOrderTrackingByNumber,
);
router.get("/:id/tracking", auth, validateParams(orderIdParamsValidate), getOrderTracking);

/** Admin routes — must be registered BEFORE /:id to avoid route conflicts. */
router.get(
  "/admin",
  auth,
  allowRoles("admin", "superAdmin"),
  validateQuery(orderListQueryValidate),
  getAllOrders,
);
router.post(
  "/admin/expire-sweep",
  auth,
  allowRoles("admin", "superAdmin"),
  rateLimiter(60, 5),
  validateInput(expireSweepValidate),
  expireOrdersSweep,
);
router.post(
  "/admin/:id/sync-payment",
  auth,
  allowRoles("admin", "superAdmin"),
  rateLimiter(60, 10),
  validateParams(orderIdParamsValidate),
  syncOrderPayment,
);
router.post(
  "/admin/:id/reconcile-payment",
  auth,
  allowRoles("admin", "superAdmin"),
  validateParams(orderIdParamsValidate),
  validateInput(reconcilePaymentValidate),
  reconcileOrderPayment,
);
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

export default router;
