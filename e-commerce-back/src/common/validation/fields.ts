/** Shared Zod field schemas for values with application-wide rules. */
import { z } from "zod";

const PHONE_PATTERN = /^\+?[1-9]\d{6,14}$/;
const PHONE_MESSAGE =
  "Phone number must be in international format (e.g. +9665xxxxxxxx)";

export const emailSchema = z.string().trim().toLowerCase().email();

export const phoneSchema = z.string().trim().regex(PHONE_PATTERN, PHONE_MESSAGE);

export const passwordSchema = z.string().min(8).max(128);
