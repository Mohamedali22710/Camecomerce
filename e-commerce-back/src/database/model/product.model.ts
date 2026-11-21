/** Product model: CCTV cameras and accessories with per-variant stock. */
import mongoose, { Document, Schema, Types } from "mongoose";

export interface IProduct extends Document {
  en_name: string;
  ar_name?: string | null;
  en_description: string;
  ar_description?: string | null;
  price: number;
  discount: number;
  stock?: number;
  /** Brand label shown on the storefront; optional for legacy rows. */
  brand?: string | null;
  imageURLs?: string | null;
  colorImages?: string | null;
  /** JSON string: [{ keyEn, keyAr?, valueEn, valueAr?, unit? }]. */
  specifications?: string | null;
  /** JSON string: [{ color, size, stock }]. "size" is a free-form variant label. */
  variants?: string | null;
  subcategoryId: Types.ObjectId;
  addedByEmail: string;
  isActive: boolean;
}

const productSchema = new Schema<IProduct>(
  {
    en_name: { type: String, required: true, trim: true },
    ar_name: { type: String, default: null, trim: true },
    en_description: { type: String, required: true },
    ar_description: { type: String, default: null },
    price: { type: Number, required: true, min: 1 },
    discount: { type: Number, default: 0, min: 0, max: 100 },
    stock: { type: Number, default: 100, min: 0 },
    brand: { type: String, default: null, trim: true, maxlength: 80 },
    imageURLs: { type: String, default: null },
    colorImages: { type: String, default: null },
    specifications: { type: String, default: null },
    variants: { type: String, default: null },
    subcategoryId: {
      type: Schema.Types.ObjectId,
      ref: "Subcategory",
      required: true,
    },
    addedByEmail: { type: String, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

productSchema.index({ subcategoryId: 1, isActive: 1 });
productSchema.index({ isActive: 1, createdAt: -1 });
productSchema.index({ en_name: 1 });

export const productModel = mongoose.model<IProduct>("Product", productSchema);
