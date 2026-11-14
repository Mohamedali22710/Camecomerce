/** Zod validation schemas for subcategory endpoints. */
import { z } from "zod";

import { booleanFromInput } from "../../common/validation/coercion.js";
import { objectIdSchema } from "../../common/validation/objectId.js";

const name = z.string().trim().max(200);

/** Validation schema for creating a subcategory. */
export const createSubcategoryValidate = z.looseObject({
  en_name: name,
  ar_name: name.optional().nullable(),
  fr_name: name.optional().nullable(),
  categoryId: objectIdSchema,
});

/** Validation schema for updating a subcategory. */
export const updateSubcategoryValidate = z
  .looseObject({
    en_name: name.optional(),
    ar_name: name.optional().nullable(),
    fr_name: name.optional().nullable(),
    categoryId: objectIdSchema.optional(),
    isActive: booleanFromInput.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });
