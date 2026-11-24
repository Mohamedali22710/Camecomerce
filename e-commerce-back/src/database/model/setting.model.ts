/** Store settings model: configurable store-wide parameters like shipping cost and type. */
import mongoose, { Document, Schema } from "mongoose";

export const SHIPPING_COST_TYPES = ["fixed", "percentage"] as const;
export type ShippingCostType = (typeof SHIPPING_COST_TYPES)[number];

export interface ISetting extends Document {
  key: string;
  shippingCost: number;
  shippingType: ShippingCostType;
  updatedBy?: string | null;
}

const settingSchema = new Schema<ISetting>(
  {
    key: { type: String, required: true, unique: true, default: "store_settings" },
    shippingCost: { type: Number, required: true, default: 0, min: 0 },
    shippingType: { type: String, enum: SHIPPING_COST_TYPES, default: "fixed" },
    updatedBy: { type: String, default: null },
  },
  { timestamps: true },
);

export const settingModel = mongoose.model<ISetting>("Setting", settingSchema);

