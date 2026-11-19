/** Validation for payment endpoints (MVP-14/MVP-20). */
import { z } from "zod";

import { PAYMENT_METHOD_CODES } from "./payment.types.js";

/**
 * Order numbers are `CCTV-YYMMDD-XXXX` for new orders and `CCTV-LEGACY-XXXXXXXX`
 * for legacy display-only fallbacks. Only this opaque identifier is accepted
 * from the return URL; provider status fields are never trusted.
 */
const orderNumberSchema = z
  .string()
  .trim()
  .min(5)
  .max(40)
  .regex(/^CCTV-[A-Z0-9-]+$/, "Invalid order number");

export const paymentOrderParamsValidate = z.looseObject({
  orderNumber: orderNumberSchema,
});

/** Body for creating/retrying a hosted session; amounts are never accepted. */
export const paymentSessionValidate = z.looseObject({
  orderNumber: orderNumberSchema,
  method: z.enum(PAYMENT_METHOD_CODES).optional(),
});
