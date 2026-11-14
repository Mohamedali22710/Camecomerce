/** Joi validation schemas for cart endpoints. */
import Joi from "joi";

import { objectIdSchema } from "../../common/validation/objectId.js";
import { DEFAULT_VARIANT_VALUE } from "../../common/validation/variant.js";

const variantLabel = Joi.string()
  .trim()
  .max(50)
  .default(DEFAULT_VARIANT_VALUE);

/** Schema for adding an item to the cart. */
export const addCartValidate = Joi.object({
  productId: objectIdSchema.required(),
  color: variantLabel.optional(),
  size: variantLabel.optional(),
  quantity: Joi.number().integer().min(1).max(1000).required(),
});

/** Schema for updating a cart item quantity. */
export const updateCartQuantityValidate = Joi.object({
  quantity: Joi.number().integer().min(1).max(1000).required(),
});
