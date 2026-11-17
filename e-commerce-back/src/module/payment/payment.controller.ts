/** Payment routes (MVP-14). */
import { Router } from "express";

import { auth } from "../../common/middleware/auth.js";
import { rateLimiter } from "../../common/utils/rateLimit.js";
import { validateParams } from "../../common/utils/validate.js";

import { getPaymentStatus } from "./payment.service.js";
import { paymentOrderParamsValidate } from "./payment.validate.js";

const router = Router();

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
