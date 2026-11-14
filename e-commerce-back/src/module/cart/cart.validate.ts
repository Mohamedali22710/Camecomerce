/** Zod validation schemas for cart endpoints. */
import { z } from "zod";

import { objectIdSchema } from "../../common/validation/objectId.js";
import { variantLabelSchema } from "../../common/validation/variant.js";

/** Schema for adding an item to the cart. */
export const addCartValidate = z.looseObject({
  productId: objectIdSchema,
  color: variantLabelSchema,
  size: variantLabelSchema,
  quantity: z.coerce.number().int().min(1).max(1000),
});

/** Schema for updating a cart item quantity. */
export const updateCartQuantityValidate = z.looseObject({
  quantity: z.coerce.number().int().min(1).max(1000),
});
