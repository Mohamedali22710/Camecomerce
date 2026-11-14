/** Joi validation schemas for the public contact form. */
import Joi from "joi";

export const contactFormValidate = Joi.object({
  name: Joi.string().trim().min(1).max(200).required(),
  email: Joi.string().trim().lowercase().email().required(),
  subject: Joi.string().trim().min(1).max(500).required(),
  message: Joi.string().trim().min(1).max(5000).required(),
});
