/** Joi validation schemas for subcategory endpoints. */
import Joi from "joi";

import { objectIdSchema } from "../../common/validation/objectId.js";

const name = Joi.string().trim().max(200);

/** Validation schema for creating a subcategory. */
export const createSubcategoryValidate = Joi.object({
  en_name: name.required(),
  ar_name: name.optional().allow("", null),
  fr_name: name.optional().allow("", null),
  categoryId: objectIdSchema.required(),
});

/** Validation schema for updating a subcategory. */
export const updateSubcategoryValidate = Joi.object({
  en_name: name.optional(),
  ar_name: name.optional().allow("", null),
  fr_name: name.optional().allow("", null),
  categoryId: objectIdSchema.optional(),
  isActive: Joi.boolean().optional(),
}).min(1);
