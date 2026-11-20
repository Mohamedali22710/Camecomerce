/** Zod validation schemas for category endpoints. */
import { z } from "zod";

const name = z.string().trim().max(200);

/** Validation schema for creating a category. */
export const createCategoryValidate = z.looseObject({
  en_name: name,
  ar_name: name.optional().nullable(),
});

/** Validation schema for updating a category. */
export const updateCategoryValidate = z
  .looseObject({
    en_name: name.optional(),
    ar_name: name.optional().nullable(),
    imageURL: z.string().trim().max(2000).optional().nullable(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });
