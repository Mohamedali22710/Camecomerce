/** Joi validation schemas for category endpoints. */
import Joi from "joi";

const name = Joi.string().trim().max(200);

/** Validation schema for creating a category. */
export const createCategoryValidate = Joi.object({
  en_name: name.required(),
  ar_name: name.optional().allow("", null),
  fr_name: name.optional().allow("", null),
});

/** Validation schema for updating a category. */
export const updateCategoryValidate = Joi.object({
  en_name: name.optional(),
  ar_name: name.optional().allow("", null),
  fr_name: name.optional().allow("", null),
  imageURL: Joi.string().trim().max(2000).optional().allow("", null),
}).min(1);
