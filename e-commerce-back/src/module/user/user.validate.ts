/** Zod validation schemas for user endpoints. */
import { z } from "zod";

import { phoneSchema } from "../../common/validation/fields.js";

/** Validation schema for profile updates. */
export const updateProfileValidate = z.looseObject({
  name: z.string().trim().min(1).max(200).optional(),
  phone: phoneSchema.optional(),
});
