/** Payment routes (MVP-14/MVP-16/MVP-20). */
import { Router } from "express";

import { auth } from "../../common/middleware/auth.js";
import { rateLimiter } from "../../common/utils/rateLimit.js";
import { validateInput, validateParams } from "../../common/utils/validate.js";

import { createPaymentSession, getPaymentMethods, getPaymentStatus } from "./payment.service.js";
import { paymentOrderParamsValidate, paymentSessionValidate } from "./payment.validate.js";

const router = Router();

/**
 * @route GET /payment/methods
 * @desc Methods the merchant has actually activated. Never returns integration
 *       ids, keys, or secrets.
 * @access Public
 * @returns { 200 } { message, data: { cod, provider, region, environment, methods } }
 */
router.get("/methods", rateLimiter(60, 60), getPaymentMethods);

/**
 * @route POST /payment/session
 * @desc Creates or retries a hosted session for a persisted pending card order.
 *       Amounts are read from the order; a disabled method returns 400.
 * @access User or admin
 * @returns { 200 } { message, data: { orderId, orderNumber, paymentStatus, redirectUrl, provider } }
 */
router.post(
  "/session",
  rateLimiter(60, 10),
  auth,
  validateInput(paymentSessionValidate),
  createPaymentSession,
);

/**
 * @route GET /payment/status/:orderNumber
 * @desc Stored payment status for an order owned by the caller (or any order for
 *       an admin). Query-string provider parameters are ignored.
 * @access User or admin
 * @returns { 200 } { message, data: { orderNumber, paymentStatus, paymentMethod, currency, nextAction } }
 * @throws { 400 } Invalid order number format
 * @throws { 401 } Unauthorized
 * @throws { 404 } Order not found or not owned by the caller
 * @throws { 429 } Too many requests
 */
router.get(
  "/status/:orderNumber",
  rateLimiter(60, 60),
  auth,
  validateParams(paymentOrderParamsValidate),
  getPaymentStatus,
);

export default router;
