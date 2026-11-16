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

const variants = jsonArrayFromInput(variantSchema, 1);
const colorImages = jsonArrayFromInput(colorImageSchema, 0);

/** Validation schema for creating a product. */
export const createProductValidate = z.looseObject({
  en_name: name,
  ar_name: name.nullable().optional(),
  fr_name: name.nullable().optional(),
  en_description: description,
  ar_description: description.nullable().optional(),
  fr_description: description.nullable().optional(),
  price: z.coerce.number().min(1),
  discount: z.coerce.number().min(0).max(100).optional(),
  brand: brand.nullable().optional(),
  subcategoryId: objectIdSchema,
  variants,
  specifications: specificationsSchema.optional(),
  colorImages: colorImages.optional(),
});

/** Validation schema for updating a product. */
export const updateProductValidate = z
  .looseObject({
    en_name: name.optional(),
    ar_name: name.nullable().optional(),
    fr_name: name.nullable().optional(),
    en_description: description.optional(),
    ar_description: description.nullable().optional(),
    fr_description: description.nullable().optional(),
    price: z.coerce.number().min(1).optional(),
    discount: z.coerce.number().min(0).max(100).optional(),
    brand: brand.nullable().optional(),
    subcategoryId: objectIdSchema.optional(),
    imageURLs: z.string().nullable().optional(),
    variants: variants.optional(),
    specifications: specificationsSchema.optional(),
    colorImages: colorImages.optional(),
    isActive: booleanFromInput.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });
