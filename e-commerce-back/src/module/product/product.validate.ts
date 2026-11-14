/** Joi validation schemas for product endpoints. */
import Joi from "joi";

import { objectIdSchema } from "../../common/validation/objectId.js";
import { variantSchema } from "../../common/validation/variant.js";

const name = Joi.string().trim().max(200);
const description = Joi.string().trim().max(10000);

const colorImageSchema = Joi.object({
  color: Joi.string().trim().max(50).required(),
  imageURL: Joi.string().trim().max(5_000_000).optional().allow(""),
});

/**
 * Accepts either a real JSON array (application/json) or a JSON string
 * (multipart/form-data, where every field arrives as text).
 */
const jsonArray = (item: Joi.Schema, min = 0): Joi.Schema =>
  Joi.any().custom((value, helpers) => {
    let parsed = value;
    if (typeof value === "string") {
      try {
        parsed = JSON.parse(value);
      } catch {
        return helpers.error("any.invalid");
      }
    }
    if (!Array.isArray(parsed)) {return helpers.error("any.invalid");}

    const { error, value: validated } = Joi.array()
      .items(item)
      .min(min)
      .validate(parsed);
    if (error) {return helpers.error("any.invalid");}

    return validated;
  }, "JSON array input");

const variants = jsonArray(variantSchema, 1);
const colorImages = jsonArray(colorImageSchema, 0);

/** Validation schema for creating a product. */
export const createProductValidate = Joi.object({
  en_name: name.required(),
  ar_name: name.optional().allow("", null),
  fr_name: name.optional().allow("", null),
  en_description: description.required(),
  ar_description: description.optional().allow("", null),
  fr_description: description.optional().allow("", null),
  price: Joi.number().min(1).required(),
  discount: Joi.number().min(0).max(100).optional(),
  subcategoryId: objectIdSchema.required(),
  variants: variants.required(),
  colorImages: colorImages.optional(),
});

/** Validation schema for updating a product. */
export const updateProductValidate = Joi.object({
  en_name: name.optional(),
  ar_name: name.optional().allow("", null),
  fr_name: name.optional().allow("", null),
  en_description: description.optional(),
  ar_description: description.optional().allow("", null),
  fr_description: description.optional().allow("", null),
  price: Joi.number().min(1).optional(),
  discount: Joi.number().min(0).max(100).optional(),
  subcategoryId: objectIdSchema.optional(),
  imageURLs: Joi.string().optional().allow("", null),
  variants: variants.optional(),
  colorImages: colorImages.optional(),
  isActive: Joi.boolean().optional(),
}).min(1);
