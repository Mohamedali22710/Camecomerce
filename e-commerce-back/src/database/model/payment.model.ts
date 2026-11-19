/** Payment ledger (MVP-17).
 *
 * One row per provider transaction. The compound unique index on
 * `{ provider, providerTransactionId }` is the replay guard: a retried callback
 * hits a duplicate-key error and is acknowledged without touching the order.
 *
 * Raw callback payloads are never stored. `payloadDigest` keeps a short hash so
 * support can correlate a row with provider logs without retaining card data.
 */
import mongoose, { Document, Schema, Types } from "mongoose";

import {
  PAYMENT_EVENT_TYPES,
  PAYMENT_PROCESSING_RESULTS,
  PAYMENT_STATUSES,
  PaymentEventType,
  PaymentProcessingResult,
  PaymentStatus,
} from "../../module/payment/payment.types.js";

export interface IPaymentTransaction extends Document {
  /** Null when a signed callback arrived for an order that does not exist. */
  orderId: Types.ObjectId | null;
  orderNumber: string;
  provider: string;
  providerTransactionId: string;
  intentionId: string | null;
  amountMinor: number;
  currency: string;
  status: PaymentStatus;
  success: boolean;
  /** True only for HMAC-verified webhook events. */
  hmacVerified: boolean;
  source: PaymentEventType;
  result: PaymentProcessingResult;
  reason: string | null;
  payloadDigest: string | null;
  processedAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const paymentTransactionSchema = new Schema<IPaymentTransaction>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: "Order", default: null },
    orderNumber: { type: String, required: true, trim: true },
    provider: { type: String, required: true, trim: true, lowercase: true },
    providerTransactionId: { type: String, required: true, trim: true },
    intentionId: { type: String, default: null, trim: true },
    amountMinor: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, trim: true, uppercase: true },
    status: { type: String, enum: PAYMENT_STATUSES, required: true },
    success: { type: Boolean, required: true },
    hmacVerified: { type: Boolean, default: false },
    source: { type: String, enum: PAYMENT_EVENT_TYPES, required: true },
    result: { type: String, enum: PAYMENT_PROCESSING_RESULTS, required: true },
    reason: { type: String, default: null, trim: true, maxlength: 500 },
    payloadDigest: { type: String, default: null },
    processedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true },
);

paymentTransactionSchema.index({ provider: 1, providerTransactionId: 1 }, { unique: true });
paymentTransactionSchema.index({ orderId: 1, createdAt: -1 });
paymentTransactionSchema.index({ orderNumber: 1, createdAt: -1 });

export const paymentTransactionModel = mongoose.model<IPaymentTransaction>(
  "PaymentTransaction",
  paymentTransactionSchema,
);
