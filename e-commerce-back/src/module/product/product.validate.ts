/** Zod validation schemas for product endpoints. */
import { z } from "zod";

import { booleanFromInput, jsonArrayFromInput } from "../../common/validation/coercion.js";
import { objectIdSchema } from "../../common/validation/objectId.js";
import { specificationsSchema } from "../../common/validation/specification.js";
import { variantSchema } from "../../common/validation/variant.js";

const name = z.string().trim().max(200);
const description = z.string().trim().max(10000);
const brand = z.string().trim().max(80);

const colorImageSchema = z.looseObject({
  color: z.string().trim().max(50),
  imageURL: z.string().trim().max(5_000_000).optional(),
});

const colorImageArraySchema = z.array(colorImageSchema);
const colorImageMapSchema = z.record(z.string().trim().max(50), z.string().max(5_000_000).nullable().optional());

export const colorImagesValidate = z.preprocess((value) => {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }
  let parsed = value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "" || trimmed === "null" || trimmed === "{}" || trimmed === "[]") {
      return undefined;
    }
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      return undefined;
    }
  }
  if (parsed === null || parsed === undefined) {
    return undefined;
  }
  if (Array.isArray(parsed)) {
    return parsed.length === 0 ? undefined : parsed;
  }
  if (typeof parsed === "object") {
    return Object.keys(parsed).length === 0 ? undefined : parsed;
  }
  return parsed;
}, z.union([colorImageArraySchema, colorImageMapSchema]).optional());

const variants = jsonArrayFromInput(variantSchema, 1);
const colorImages = colorImagesValidate;

/** Validation schema for creating a product. */
export const createProductValidate = z.looseObject({
  en_name: name,
  ar_name: name.nullable().optional(),
  en_description: description,
  ar_description: description.nullable().optional(),
  price: z.coerce.number().min(1),
  discount: z.coerce.number().min(0).max(100).optional(),
  stock: z.coerce.number().min(0).optional(),
  brand: brand.nullable().optional(),
  subcategoryId: objectIdSchema,
  variants: variants.optional(),
  specifications: specificationsSchema.optional(),
  colorImages: colorImages.optional(),
});

/** Validation schema for updating a product. */
export const updateProductValidate = z
  .looseObject({
    en_name: name.optional(),
    ar_name: name.nullable().optional(),
    en_description: description.optional(),
    ar_description: description.nullable().optional(),
    price: z.coerce.number().min(1).optional(),
    discount: z.coerce.number().min(0).max(100).optional(),
    stock: z.coerce.number().min(0).optional(),
    brand: brand.nullable().optional(),
    subcategoryId: z.preprocess(
      (val) => (val === "" || val === null ? undefined : val),
      objectIdSchema.optional(),
    ),
    imageURLs: z.union([z.string(), z.array(z.string())]).nullable().optional(),
    variants: variants.optional(),
    specifications: specificationsSchema.optional(),
    colorImages: colorImages.optional(),
    isActive: booleanFromInput.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });
