/** Paymob transaction-callback HMAC (MVP-16).
 *
 * Documented algorithm: HMAC-SHA512 over exactly twenty values from the
 * callback's `obj`, concatenated in this order with no separator, hex-encoded
 * lowercase and compared in constant time. The signature arrives as the `hmac`
 * query parameter, not a header.
 *
 * Kept pure so the field order and string conversion can be unit-tested with a
 * known vector without touching the network or a database.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

import type { PaymentStatus } from "./payment.types.js";

/**
 * Transaction Processed callback fields in Paymob's documented concatenation
 * order. `order.id` and `source_data.*` are nested paths.
 */
export const PAYMOB_TRANSACTION_HMAC_FIELDS = [
  "amount_cents",
  "created_at",
  "currency",
  "error_occured",
  "has_parent_transaction",
  "id",
  "integration_id",
  "is_3d_secure",
  "is_auth",
  "is_capture",
  "is_refunded",
  "is_standalone_payment",
  "is_voided",
  "order.id",
  "owner",
  "pending",
  "source_data.pan",
  "source_data.sub_type",
  "source_data.type",
  "success",
] as const;

const readPath = (source: Record<string, unknown>, path: string): unknown =>
  path.split(".").reduce<unknown>((value, key) => {
    if (!value || typeof value !== "object") {
      return undefined;
    }
    return (value as Record<string, unknown>)[key];
  }, source);

/**
 * Paymob's documented concatenation uses the raw received representation.
 * Null/undefined becomes an empty string (matching the reference
 * implementations); booleans become the literal `true`/`false`.
 */
export const hmacValueToString = (value: unknown): string => {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  return String(value);
};

/** Builds the exact string Paymob signs. Exported for the HMAC test vector. */
export const buildPaymobHmacString = (obj: Record<string, unknown>): string =>
  PAYMOB_TRANSACTION_HMAC_FIELDS.map((field) => hmacValueToString(readPath(obj, field))).join("");

/** Computes the lowercase hex HMAC-SHA512 signature. */
export const computePaymobHmac = (obj: Record<string, unknown>, hmacSecret: string): string =>
  createHmac("sha512", hmacSecret).update(buildPaymobHmacString(obj)).digest("hex");

/**
 * Constant-time comparison. A missing, empty, or wrong-length signature is a
 * mismatch rather than an exception.
 */
export const verifyPaymobHmac = (
  obj: Record<string, unknown>,
  receivedHmac: string | undefined,
  hmacSecret: string,
): boolean => {
  if (!receivedHmac) {
    return false;
  }
  const expected = Buffer.from(computePaymobHmac(obj, hmacSecret), "utf8");
  const provided = Buffer.from(receivedHmac.trim().toLowerCase(), "utf8");
  return expected.length === provided.length && timingSafeEqual(expected, provided);
};

/**
 * Maps the transaction object to the application's payment states.
 *
 * `is_refunded` is intentionally kept as `paid`: `paid` is terminal in this
 * application and refunds are handled manually through the provider dashboard.
 * `is_voided` means the attempt was cancelled before capture.
 */
export const mapPaymobTransactionStatus = (obj: Record<string, unknown>): {
  status: PaymentStatus;
  success: boolean;
  pending: boolean;
} => {
  const success = obj.success === true;
  const pending = obj.pending === true;
  const voided = obj.is_voided === true;

  if (voided) {
    return { status: "cancelled", success, pending: false };
  }
  if (success && !pending) {
    return { status: "paid", success: true, pending: false };
  }
  if (pending) {
    return { status: "pending", success, pending: true };
  }
  return { status: "failed", success: false, pending: false };
};
