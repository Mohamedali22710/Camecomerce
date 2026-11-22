/** Zod validation schemas for auth endpoints. */
import { z } from "zod";

import { emailSchema, passwordSchema, phoneSchema } from "../../common/validation/fields.js";

/** Password schema with full complexity matching frontend rules (min 8, max 128, uppercase, lowercase, number). */
export const strongPasswordSchema = passwordSchema
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

/** Email schema matching frontend rules (valid email format, trimmed, lowercase, max 255 chars). */
export const authEmailSchema = emailSchema.max(255, "Email is too long");

const passwordConfirmation = z.object({
  password: strongPasswordSchema,
  confirmPassword: z.string().min(1, "Please confirm your password"),
});

const passwordsMatch = (data: { password: string; confirmPassword: string }) =>
  data.password === data.confirmPassword;

const passwordMismatch = {
  path: ["confirmPassword"],
  message: "Passwords do not match",
};

/** Validation schema for user signup. Name is derived from the email prefix. */
export const signupValidate = z
  .looseObject({
    email: authEmailSchema,
    password: strongPasswordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password"),
    role: z.enum(["admin", "user", "superAdmin"]).optional(),
    phone: phoneSchema,
  })
  .refine(passwordsMatch, passwordMismatch);

/** Validation schema for email/password login. */
export const loginValidate = z.looseObject({
  email: authEmailSchema,
  password: z.string().min(1),
});

/** Validation schema for password reset. */
export const resetPasswordValidate = passwordConfirmation.refine(
  passwordsMatch,
  passwordMismatch,
);

/** Validation schema for endpoints that only accept an email address. */
export const emailOnlyValidate = z.looseObject({ email: authEmailSchema });
