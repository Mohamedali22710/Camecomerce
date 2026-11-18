/** Cart model: one row per product variant or configured bundle selection.
 *
 * Bundle lines were added in MVP-09. A line is either a product variant
 * (`itemType: "product"`) or a bundle with a whitelisted HDD/installation
 * selection (`itemType: "bundle"`). The selected option codes are stored
 * explicitly so the cart and the order resolve the exact same price.
 */
import mongoose, { Document, Schema, Types } from "mongoose";

export const CART_ITEM_TYPES = ["product", "bundle"] as const;
export type CartItemType = (typeof CART_ITEM_TYPES)[number];

export interface ICart extends Document {
  userId: Types.ObjectId;
  itemType: CartItemType;
  productId?: Types.ObjectId | null;
  bundleId?: Types.ObjectId | null;
  color: string;
  size: string;
  hddOption?: string | null;
  installationOption?: string | null;
  quantity: number;
}

const cartSchema = new Schema<ICart>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    itemType: {
      type: String,
      enum: CART_ITEM_TYPES,
      default: "product",
      required: true,
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      default: null,
      required: function (this: ICart) {
        return this.itemType === "product";
      },
    },
    bundleId: {
      type: Schema.Types.ObjectId,
      ref: "Bundle",
      default: null,
      required: function (this: ICart) {
        return this.itemType === "bundle";
      },
    },
    color: { type: String, required: true, default: "Default", trim: true },
    size: { type: String, required: true, default: "Default", trim: true },
    hddOption: { type: String, default: null, trim: true },
    installationOption: { type: String, default: null, trim: true },
    quantity: { type: Number, required: true, min: 1, default: 1 },
  },
  { timestamps: true },
);

/**
 * Product and bundle uniqueness are separate because a bundle line has no
 * productId. Deployments that created the pre-MVP-09
 * `userId_1_productId_1_color_1_size_1` index must drop that obsolete index
 * once, otherwise a user can hold only one bundle line. No data is modified
 * here; the new indexes are additive and Mongoose creates them lazily.
 */
cartSchema.index(
  { userId: 1, productId: 1, color: 1, size: 1 },
  { unique: true, partialFilterExpression: { itemType: "product" } },
);
cartSchema.index(
  { userId: 1, bundleId: 1, hddOption: 1, installationOption: 1 },
  { unique: true, partialFilterExpression: { itemType: "bundle" } },
);

export const cartModel = mongoose.model<ICart>("Cart", cartSchema);
