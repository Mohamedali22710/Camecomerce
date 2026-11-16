/** Shared bundle validation rules (MVP-05, MVP-06, MVP-08).
 *
 * A bundle is a fixed CCTV kit with server-owned prices. Option codes are
 * validated against the bundle itself so a client can never supply a price or an
 * unknown option.
 *
 * Inventory is intentionally absent: whether a bundle has its own stock counter
 * or deducts component stock is business decision DEC-01 and is not implemented.
 */
import { z } from "zod";

import { booleanFromInput } from "./coercion.js";
import { objectIdSchema } from "./objectId.js";
import { variantLabelSchema } from "./variant.js";

export const MAX_BUNDLE_COMPONENTS = 50;
export const MAX_BUNDLE_OPTIONS = 20;
export const MAX_BUNDLE_CODE_LENGTH = 60;
export const MAX_OPTION_CODE_LENGTH = 40;
export const MAX_BUNDLE_LABEL_LENGTH = 100;

const bundleCode = z.string().trim().min(1).max(MAX_BUNDLE_CODE_LENGTH);
const bundleName = z.string().trim().min(1).max(200);
const optionalText = (max: number) => z.string().trim().max(max).nullable().optional();

export const bundleComponentSchema = z.looseObject({
  productId: objectIdSchema,
  color: variantLabelSchema,
  size: variantLabelSchema,
  quantity: z.coerce.number().int().min(1).max(1000),
});

export const bundleHddOptionSchema = z.looseObject({
  code: z.string().trim().min(1).max(MAX_OPTION_CODE_LENGTH),
  labelEn: z.string().trim().min(1).max(MAX_BUNDLE_LABEL_LENGTH),
  labelAr: optionalText(MAX_BUNDLE_LABEL_LENGTH),
  priceDelta: z.coerce.number().min(0),
});

export const bundleInstallationOptionSchema = z.looseObject({
  code: z.string().trim().min(1).max(MAX_OPTION_CODE_LENGTH),
  labelEn: z.string().trim().min(1).max(MAX_BUNDLE_LABEL_LENGTH),
  labelAr: optionalText(MAX_BUNDLE_LABEL_LENGTH),
  priceDelta: z.coerce.number().min(0),
  city: optionalText(MAX_BUNDLE_LABEL_LENGTH),
});

/** True when every option code is unique (case-insensitive after trimming). */
export const hasUniqueOptionCodes = (options: { code: string }[]): boolean => {
  const codes = options.map((option) => option.code.trim().toLowerCase());
  return new Set(codes).size === codes.length;
};

const hasNoInventoryField = (data: unknown): boolean => {
  const record = data as Record<string, unknown>;
  return record.stock === undefined && record.availability === undefined;
};

const inventoryMessage = "Bundle inventory is pending business decision DEC-01; omit 'stock' and 'availability'.";

const createShape = {
  code: bundleCode,
  en_name: bundleName,
  ar_name: optionalText(200),
  description: optionalText(5000),
  imageURLs: z.array(z.string().trim().max(5_000_000)).max(20).optional(),
  basePrice: z.coerce.number().positive(),
  discount: z.coerce.number().min(0).max(100).optional(),
  cameras: z.array(bundleComponentSchema).min(1).max(MAX_BUNDLE_COMPONENTS),
  hddOptions: z.array(bundleHddOptionSchema).min(1).max(MAX_BUNDLE_OPTIONS),
  installationOptions: z.array(bundleInstallationOptionSchema).min(1).max(MAX_BUNDLE_OPTIONS),
  isActive: booleanFromInput.optional(),
};

/** Validation schema for creating a bundle. */
export const createBundleValidate = z.looseObject(createShape).superRefine((data, context) => {
  if (!hasNoInventoryField(data)) {
    context.addIssue({
      code: "custom",
      path: ["stock"],
      message: inventoryMessage,
    });
  }
  if (!hasUniqueOptionCodes(data.hddOptions)) {
    context.addIssue({
      code: "custom",
      path: ["hddOptions"],
      message: "HDD option codes must be unique",
    });
  }
  if (!hasUniqueOptionCodes(data.installationOptions)) {
    context.addIssue({
      code: "custom",
      path: ["installationOptions"],
      message: "Installation option codes must be unique",
    });
  }
});

const updateShape = {
  code: bundleCode.optional(),
  en_name: bundleName.optional(),
  ar_name: optionalText(200),
  description: optionalText(5000),
  imageURLs: z.array(z.string().trim().max(5_000_000)).max(20).optional(),
  basePrice: z.coerce.number().positive().optional(),
  discount: z.coerce.number().min(0).max(100).optional(),
  cameras: z.array(bundleComponentSchema).min(1).max(MAX_BUNDLE_COMPONENTS).optional(),
  hddOptions: z.array(bundleHddOptionSchema).min(1).max(MAX_BUNDLE_OPTIONS).optional(),
  installationOptions: z.array(bundleInstallationOptionSchema).min(1).max(MAX_BUNDLE_OPTIONS).optional(),
  isActive: booleanFromInput.optional(),
};

/** Validation schema for updating a bundle. At least one field is required. */
export const updateBundleValidate = z.looseObject(updateShape).superRefine((data, context) => {
  if (!hasNoInventoryField(data)) {
    context.addIssue({
      code: "custom",
      path: ["stock"],
      message: inventoryMessage,
    });
  }
  if (data.hddOptions && !hasUniqueOptionCodes(data.hddOptions)) {
    context.addIssue({
      code: "custom",
      path: ["hddOptions"],
      message: "HDD option codes must be unique",
    });
  }
  if (data.installationOptions && !hasUniqueOptionCodes(data.installationOptions)) {
    context.addIssue({
      code: "custom",
      path: ["installationOptions"],
      message: "Installation option codes must be unique",
    });
  }
  const knownFields = Object.keys(updateShape);
  const record = data as Record<string, unknown>;
  if (!knownFields.some((field) => record[field] !== undefined)) {
    context.addIssue({
      code: "custom",
      path: [],
      message: "At least one field is required",
    });
  }
});
