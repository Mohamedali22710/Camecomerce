/** Joi validation schemas for user endpoints. */
import Joi from "joi";

/** Validation schema for profile updates. */
export const updateProfileValidate = Joi.object({
  name: Joi.string().trim().min(1).max(200).optional(),
  phone: Joi.string()
    .pattern(/^\+?[1-9]\d{6,14}$/)
    .optional()
    .messages({
      "string.pattern.base":
        "Phone number must be in international format (e.g. +9665xxxxxxxx)",
    }),
});
