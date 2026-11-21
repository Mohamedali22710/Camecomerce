/** Zod validation schemas for auth endpoints. */
import { z } from "zod";

import { emailSchema, passwordSchema, phoneSchema } from "../../common/validation/fields.js";

const passwordConfirmation = z.object({
  password: passwordSchema,
  confirmPassword: passwordSchema,
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
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: passwordSchema,
    role: z.enum(["admin", "user", "superAdmin"]).optional(),
    phone: phoneSchema,
  })
  .refine(passwordsMatch, passwordMismatch);

/** Validation schema for email/password login. */
export const loginValidate = z.looseObject({
  email: emailSchema,
  password: z.string().min(1),
});

/** Validation schema for password reset. */
export const resetPasswordValidate = passwordConfirmation.refine(
  passwordsMatch,
  passwordMismatch,
);

/** Validation schema for endpoints that only accept an email address. */
export const emailOnlyValidate = z.looseObject({ email: emailSchema });
