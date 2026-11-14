/** Reusable Joi schema for MongoDB ObjectIds. */
import Joi from "joi";

export const objectIdSchema = Joi.string()
  .trim()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .messages({ "string.pattern.base": "{{#label}} must be a valid MongoDB ObjectId" });
