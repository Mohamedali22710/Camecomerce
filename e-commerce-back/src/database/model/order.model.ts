/** Order model.
 *
 * Payment, order fulfillment, shipping, and installation are deliberately kept
 * as separate statuses/workflows.
 *
 * MVP-11 adds a human-readable unique `orderNumber`, an append-only
 * `statusHistory` audit trail, and `stockReleasedAt` which makes stock release
 * a one-time operation. `paymentAttempts` links the order to provider
 * transactions once the ledger lands (MVP-17); the reference stays optional so
 * the existing Stripe path keeps working.
 */
import mongoose, { Document, Schema, Types } from "mongoose";

export const ORDER_STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/**
 * Payment states persisted on the order.
 *
 * Kept in sync with the provider-agnostic contract in
 * `src/module/payment/payment.types.ts`. `paid` is terminal and is never
 * downgraded; `expired` and `cancelled` exist so abandoned or voided attempts can
 * be reconciled without inventing a new collection.
 */
export const PAYMENT_STATUSES = ["pending", "paid", "failed", "expired", "cancelled"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const SHIPPING_STATUSES = ["pending", "prepared", "shipped", "delivered", "returned", "cancelled"] as const;
export type ShippingStatus = (typeof SHIPPING_STATUSES)[number];

export const STATUS_FIELDS = ["orderStatus", "paymentStatus", "shippingStatus"] as const;
export type StatusField = (typeof STATUS_FIELDS)[number];

/** One append-only audit row for a status transition. */
export interface IOrderStatusHistoryEntry {
  at: Date;
  actor: string;
  actorId: string | null;
  field: StatusField;
  from: string;
  to: string;
  reason: string | null;
}

export interface IOrder extends Document {
  userId: Types.ObjectId;
  /** Present on orders created since MVP-11; legacy rows may be missing it. */
  orderNumber?: string | null;
  items: string;
  subtotal: number;
  totalAmount: number;
  shippingCost: number;
  paymentMethod: "cod" | "card";
  paymentStatus: PaymentStatus;
  /** Provider used for card payments (for example "stripe", later "paymob"). */
  paymentProvider?: string | null;
  /** Provider-side session/reference. Never contains card data. */
  paymentReference?: string | null;
  orderStatus: OrderStatus;
  shippingStatus: ShippingStatus;
  shippingCarrier?: string | null;
  trackingNumber?: string | null;
  shippingAddress: string;
  installationRequested: boolean;
  installationRequestId?: Types.ObjectId | null;
  idempotencyKey?: string | null;
  statusHistory: IOrderStatusHistoryEntry[];
  /** Set exactly once by the stock-release path (MVP-11/MVP-19). */
  stockReleasedAt?: Date | null;
  /** Ledger rows for this order (MVP-17). Kept optional for now. */
  paymentAttempts: Types.ObjectId[];
}

const statusHistorySchema = new Schema<IOrderStatusHistoryEntry>(
  {
    at: { type: Date, required: true, default: Date.now },
    actor: { type: String, required: true, trim: true },
    // Stored as a string so the audit row survives even if the account is removed.
    actorId: { type: String, default: null },
    field: { type: String, enum: STATUS_FIELDS, required: true },
    from: { type: String, required: true },
    to: { type: String, required: true },
    reason: { type: String, default: null, trim: true, maxlength: 1000 },
  },
  { _id: false },
);

const orderSchema = new Schema<IOrder>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    orderNumber: { type: String, default: null, trim: true },
    items: { type: String, required: true },
    subtotal: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    shippingCost: { type: Number, default: 0, min: 0 },
    paymentMethod: {
      type: String,
      enum: ["cod", "card"],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: PAYMENT_STATUSES,
      default: "pending",
    },
    paymentProvider: { type: String, default: null },
    paymentReference: { type: String, default: null },
    orderStatus: {
      type: String,
      enum: ORDER_STATUSES,
      default: "pending",
    },
    shippingStatus: {
      type: String,
      enum: SHIPPING_STATUSES,
      default: "pending",
    },
    shippingCarrier: { type: String, default: null, trim: true },
    trackingNumber: { type: String, default: null, trim: true },
    shippingAddress: { type: String, required: true },
    installationRequested: { type: Boolean, default: false },
    installationRequestId: {
      type: Schema.Types.ObjectId,
      ref: "InstallationRequest",
      default: null,
    },
    // Optional client-supplied key that prevents duplicate order submissions.
    idempotencyKey: { type: String, default: null },
    statusHistory: { type: [statusHistorySchema], default: [] },
    stockReleasedAt: { type: Date, default: null },
    paymentAttempts: {
      type: [{ type: Schema.Types.ObjectId, ref: "PaymentTransaction" }],
      default: [],
    },
  },
  { timestamps: true },
);

orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ orderStatus: 1, createdAt: -1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ shippingStatus: 1 });
orderSchema.index(
  { orderNumber: 1 },
  {
    unique: true,
    partialFilterExpression: { orderNumber: { $type: "string" } },
  },
);
orderSchema.index(
  { userId: 1, idempotencyKey: 1 },
  {
    unique: true,
    partialFilterExpression: { idempotencyKey: { $type: "string" } },
  },
);

export const orderModel = mongoose.model<IOrder>("Order", orderSchema);
