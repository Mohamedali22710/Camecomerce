/** Reusable Zod schema for MongoDB ObjectIds. */
import { z } from "zod";

const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

export const objectIdSchema = z
  .string()
  .trim()
  .regex(OBJECT_ID_PATTERN, "must be a valid MongoDB ObjectId");
