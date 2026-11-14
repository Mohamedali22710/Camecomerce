/** Order model.
 *
 * Payment, order fulfillment, shipping, and installation are deliberately kept
 * as separate statuses/workflows.
 */
import mongoose, { Document, Schema, Types } from "mongoose";

export const ORDER_STATUSES = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = ["pending", "paid", "failed"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const SHIPPING_STATUSES = [
  "pending",
  "prepared",
  "shipped",
  "delivered",
  "returned",
  "cancelled",
] as const;
export type ShippingStatus = (typeof SHIPPING_STATUSES)[number];

export interface IOrder extends Document {
  userId: Types.ObjectId;
  items: string;
  subtotal: number;
  totalAmount: number;
  shippingCost: number;
  paymentMethod: "cod" | "card";
  paymentStatus: PaymentStatus;
  /** Provider used for card payments (for example "stripe", later "moyasar" / "tap"). */
  paymentProvider?: string | null;
  /** Provider-side payment/session reference. Never contains card data. */
  paymentReference?: string | null;
  orderStatus: OrderStatus;
  shippingStatus: ShippingStatus;
  shippingCarrier?: string | null;
  trackingNumber?: string | null;
  shippingAddress: string;
  installationRequested: boolean;
  installationRequestId?: Types.ObjectId | null;
  idempotencyKey?: string | null;
}

const orderSchema = new Schema<IOrder>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
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
  },
  { timestamps: true },
);

orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ orderStatus: 1, createdAt: -1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ shippingStatus: 1 });
orderSchema.index(
  { userId: 1, idempotencyKey: 1 },
  {
    unique: true,
    partialFilterExpression: { idempotencyKey: { $type: "string" } },
  },
);

export const orderModel = mongoose.model<IOrder>("Order", orderSchema);
