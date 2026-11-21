/** Zod validation schemas for user endpoints. */
import { z } from "zod";

import { phoneSchema } from "../../common/validation/fields.js";

/** Validation schema for profile updates. */
export const updateProfileValidate = z.looseObject({
  name: z.string().trim().min(1).max(200).optional(),
  phone: z.union([phoneSchema, z.literal("")]).optional(),
  password: z.union([z.string().min(6).max(128), z.literal("")]).optional(),
});

