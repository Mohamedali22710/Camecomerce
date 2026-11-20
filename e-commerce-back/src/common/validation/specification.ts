/** Product technical specifications (MVP-04).
 *
 * Stored as a JSON string on the product document (same convention as
 * `variants`) and exposed through the API as a bounded, normalized array. Legacy
 * rows or malformed values fall back to an empty array and never throw.
 */
import { z } from "zod";

export const MAX_SPECIFICATIONS = 40;
export const MAX_SPECIFICATION_KEY_LENGTH = 60;
export const MAX_SPECIFICATION_VALUE_LENGTH = 200;
export const MAX_SPECIFICATION_UNIT_LENGTH = 30;

/** Normalized representation used in API responses and snapshots. */
export interface ProductSpecification {
  keyEn: string;
  keyAr: string | null;
  valueEn: string;
  valueAr: string | null;
  unit: string | null;
}

const specificationSchema = z.looseObject({
  keyEn: z.string().trim().min(1).max(MAX_SPECIFICATION_KEY_LENGTH),
  keyAr: z.string().trim().max(MAX_SPECIFICATION_KEY_LENGTH).nullable().optional(),
  valueEn: z.string().trim().min(1).max(MAX_SPECIFICATION_VALUE_LENGTH),
  valueAr: z.string().trim().max(MAX_SPECIFICATION_VALUE_LENGTH).nullable().optional(),
  unit: z.string().trim().max(MAX_SPECIFICATION_UNIT_LENGTH).nullable().optional(),
});

/** Accepts a real array or a JSON string (multipart form submissions). Null, undefined, or empty string are coerced to undefined. */
export const specificationsSchema = z.preprocess((value) => {
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
}, z.array(specificationSchema).max(MAX_SPECIFICATIONS).optional());

const optionalText = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const normalizeSpecification = (specification: z.infer<typeof specificationSchema>): ProductSpecification => ({
  keyEn: specification.keyEn.trim(),
  keyAr: optionalText(specification.keyAr),
  valueEn: specification.valueEn.trim(),
  valueAr: optionalText(specification.valueAr),
  unit: optionalText(specification.unit),
});

/** Normalizes request input; invalid or non-array input yields an empty list. */
export const normalizeSpecificationsInput = (raw: unknown): ProductSpecification[] => {
  const result = specificationsSchema.safeParse(raw);
  return result.success && result.data ? result.data.map(normalizeSpecification) : [];
};

/** Safely parses the JSON string stored on the product document. */
export const parseSpecifications = (raw: string | null | undefined): ProductSpecification[] => {
  if (!raw) {
    return [];
  }
  try {
    return normalizeSpecificationsInput(JSON.parse(raw));
  } catch {
    return [];
  }
};

/** Serializes specifications for storage; empty input is stored as `null`. */
export const serializeSpecifications = (specifications: ProductSpecification[]): string | null =>
  specifications.length > 0 ? JSON.stringify(specifications) : null;
