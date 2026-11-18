/** Validation for payment endpoints (MVP-14). */
import { z } from "zod";

/**
 * Order numbers are `CCTV-YYMMDD-XXXX` for new orders and `CCTV-LEGACY-XXXXXXXX`
 * for legacy display-only fallbacks. Only this opaque identifier is accepted
 * from the return URL; provider status fields are never trusted.
 */
export const paymentOrderParamsValidate = z.looseObject({
  orderNumber: z
    .string()
    .trim()
    .min(5)
    .max(40)
    .regex(/^CCTV-[A-Z0-9-]+$/, "Invalid order number"),
});
