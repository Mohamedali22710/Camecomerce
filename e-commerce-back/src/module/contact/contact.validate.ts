/** Zod validation schema for the public contact form. */
import { z } from "zod";

import { emailSchema } from "../../common/validation/fields.js";

export const contactFormValidate = z.looseObject({
  name: z.string().trim().min(1).max(200),
  email: emailSchema,
  subject: z.string().trim().min(1).max(500),
  message: z.string().trim().min(1).max(5000),
});
