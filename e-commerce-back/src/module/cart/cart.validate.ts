/** Zod validation schemas for cart endpoints. */
import { z } from "zod";

import { objectIdSchema } from "../../common/validation/objectId.js";
import { variantLabelSchema } from "../../common/validation/variant.js";

const quantity = z.coerce.number().int().min(1).max(1000);
const optionCode = z.string().trim().min(1).max(40);

const productLineSchema = z.looseObject({
  itemType: z.literal("product").optional(),
  productId: objectIdSchema,
  color: variantLabelSchema,
  size: variantLabelSchema,
  quantity,
});

const bundleLineSchema = z.looseObject({
  itemType: z.literal("bundle"),
  bundleId: objectIdSchema,
  hddOption: optionCode,
  installationOption: optionCode,
  quantity,
});

/**
 * Schema for adding a line to the cart. The bundle shape is tried first so an
 * `itemType: "bundle"` payload can never fall through to the product branch.
 * Existing product-only clients remain valid because `itemType` is optional.
 */
export const addCartValidate = z.union([bundleLineSchema, productLineSchema]);

/** Schema for updating a cart item quantity (product route). */
export const updateCartQuantityValidate = z.looseObject({
  quantity,
});

/** Schema for updating a cart line quantity by line id. */
export const updateCartLineValidate = z.looseObject({
  quantity,
});

/** Schema for route params that identify one cart line. */
export const cartLineParamsValidate = z.looseObject({
  lineId: objectIdSchema,
});

/** Schema for the legacy product-variant cart route params. */
export const productCartParamsValidate = z.looseObject({
  productId: objectIdSchema,
  color: variantLabelSchema,
  size: variantLabelSchema,
});
