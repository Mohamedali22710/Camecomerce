/** Cart model: one row per user + product + variant. */
import mongoose, { Document, Schema, Types } from "mongoose";

export interface ICart extends Document {
  userId: Types.ObjectId;
  productId: Types.ObjectId;
  color: string;
  size: string;
  quantity: number;
}

const cartSchema = new Schema<ICart>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    color: { type: String, required: true, default: "Default", trim: true },
    size: { type: String, required: true, default: "Default", trim: true },
    quantity: { type: Number, required: true, min: 1, default: 1 },
  },
  { timestamps: true },
);

cartSchema.index(
  { userId: 1, productId: 1, color: 1, size: 1 },
  { unique: true },
);

export const cartModel = mongoose.model<ICart>("Cart", cartSchema);
