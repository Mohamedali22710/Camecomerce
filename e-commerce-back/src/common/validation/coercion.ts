/** Input coercions shared by multipart and JSON request schemas. */
import { z } from "zod";

/**
 * Converts checkbox-style values from multipart forms ("true"/"false") into a
 * real boolean. Native `z.coerce.boolean()` is not usable here because it turns
 * the string "false" into `true`.
 */
export const booleanFromInput = z.preprocess((value) => {
  if (typeof value !== "string") {return value;}

  const normalized = value.trim().toLowerCase();
  if (normalized === "true" || normalized === "1") {return true;}
  if (normalized === "false" || normalized === "0" || normalized === "") {return false;}
  return value;
}, z.boolean());

/**
 * Accepts either a real JSON array (application/json) or a JSON string
 * (multipart/form-data, where every field arrives as text).
 * If null, undefined, or empty string is passed, pre-processes to undefined.
 */
export const jsonArrayFromInput = <Item extends z.ZodTypeAny>(
  item: Item,
  minimum = 0,
): z.ZodType<z.infer<Item>[] | undefined> =>
  z.preprocess((value) => {
    if (value === null || value === undefined || value === "") {
      return undefined;
    }
    if (typeof value !== "string") {
      return value;
    }
    try {
      return JSON.parse(value);
    } catch {
      return undefined;
    }
  }, z.array(item).min(minimum).optional());
