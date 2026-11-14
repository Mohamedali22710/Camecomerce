/** Joi validation schemas for auth endpoints. */
import Joi from "joi";

const email = Joi.string().trim().lowercase().email().required();
const password = Joi.string().min(8).max(128).required();

/** Validation schema for user signup. Name is derived from the email prefix. */
export const signupValidate = Joi.object({
  email,
  password,
  confirmPassword: password.valid(Joi.ref("password")).messages({
    "any.only": "Passwords do not match",
  }),
  role: Joi.string().valid("admin", "user", "superAdmin").optional(),
  phone: Joi.string()
    .pattern(/^\+?[1-9]\d{6,14}$/)
    .optional()
    .allow(""),
});

/** Validation schema for email/password login. */
export const loginValidate = Joi.object({
  email,
  password: Joi.string().required(),
});

/** Validation schema for password reset. */
export const resetPasswordValidate = Joi.object({
  password,
  confirmPassword: password.valid(Joi.ref("password")).messages({
    "any.only": "Passwords do not match",
  }),
});

/** Validation schema for endpoints that only accept an email address. */
export const emailOnlyValidate = Joi.object({
  email,
});
