/** Bundle model (MVP-05).
 *
 * A bundle is a first-class sellable kit (for example a 4-camera package) with
 * server-owned pricing and whitelisted HDD/installation options. Native arrays
 * are used because this is a new collection; no JSON-string migration applies.
 *
 * Inventory is deliberately NOT modelled here. Whether a bundle keeps its own
 * stock counter or deducts component stock is business decision DEC-01, which is
 * still open. No component or HDD stock deduction exists.
 */
import mongoose, { Document, Schema, Types } from "mongoose";

export interface IBundleComponent {
  productId: Types.ObjectId;
  color: string;
  size: string;
  quantity: number;
}

export interface IBundleHddOption {
  code: string;
  labelEn: string;
  labelAr?: string | null;
  priceDelta: number;
}

export interface IBundleInstallationOption extends IBundleHddOption {
  city?: string | null;
}

export interface IBundle extends Document {
  code: string;
  en_name: string;
  ar_name?: string | null;
  description?: string | null;
  imageURLs: string[];
  basePrice: number;
  discount: number;
  cameras: IBundleComponent[];
  hddOptions: IBundleHddOption[];
  installationOptions: IBundleInstallationOption[];
  addedByEmail: string;
  isActive: boolean;
}

const componentSchema = new Schema<IBundleComponent>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    color: { type: String, default: "Default", trim: true },
    size: { type: String, default: "Default", trim: true },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false },
);

const hddOptionSchema = new Schema<IBundleHddOption>(
  {
    code: { type: String, required: true, trim: true, maxlength: 40 },
    labelEn: { type: String, required: true, trim: true, maxlength: 100 },
    labelAr: { type: String, default: null, trim: true, maxlength: 100 },
    priceDelta: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const installationOptionSchema = new Schema<IBundleInstallationOption>(
  {
    code: { type: String, required: true, trim: true, maxlength: 40 },
    labelEn: { type: String, required: true, trim: true, maxlength: 100 },
    labelAr: { type: String, default: null, trim: true, maxlength: 100 },
    priceDelta: { type: Number, required: true, min: 0 },
    city: { type: String, default: null, trim: true, maxlength: 100 },
  },
  { _id: false },
);

const uniqueCodes = (options: { code: string }[]): boolean => {
  const codes = options.map((option) => String(option.code).trim().toLowerCase());
  return new Set(codes).size === codes.length;
};

const bundleSchema = new Schema<IBundle>(
  {
    code: { type: String, required: true, trim: true, maxlength: 60 },
    en_name: { type: String, required: true, trim: true, maxlength: 200 },
    ar_name: { type: String, default: null, trim: true, maxlength: 200 },
    description: { type: String, default: null, trim: true, maxlength: 5000 },
    imageURLs: { type: [String], default: [] },
    basePrice: { type: Number, required: true, min: 0.01 },
    discount: { type: Number, default: 0, min: 0, max: 100 },
    cameras: {
      type: [componentSchema],
      validate: [
        {
          validator: (value: IBundleComponent[]) => Array.isArray(value) && value.length > 0,
          message: "A bundle requires at least one camera component",
        },
        {
          validator: (value: IBundleComponent[]) =>
            value.every((component) => Number.isInteger(component.quantity) && component.quantity > 0),
          message: "Component quantities must be positive integers",
        },
      ],
    },
    hddOptions: {
      type: [hddOptionSchema],
      validate: [
        {
          validator: (value: IBundleHddOption[]) => Array.isArray(value) && value.length > 0,
          message: "A bundle requires at least one HDD option",
        },
        {
          validator: uniqueCodes,
          message: "HDD option codes must be unique",
        },
      ],
    },
    installationOptions: {
      type: [installationOptionSchema],
      validate: [
        {
          validator: (value: IBundleInstallationOption[]) => Array.isArray(value) && value.length > 0,
          message: "A bundle requires at least one installation option",
        },
        {
          validator: uniqueCodes,
          message: "Installation option codes must be unique",
        },
      ],
    },
    addedByEmail: { type: String, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

bundleSchema.index({ code: 1 }, { unique: true });
bundleSchema.index({ isActive: 1, createdAt: -1 });

export const bundleModel = mongoose.model<IBundle>("Bundle", bundleSchema);
