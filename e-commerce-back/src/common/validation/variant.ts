/** Shared product-variant helpers.
 *
 * Variants are intentionally generic so the same code supports CCTV cameras and
 * accessories (for example color "White" + size "2TB") without clothing-only enums.
 * "size" is a free-form variant label, not a garment size.
 */
import Joi from "joi";

export const DEFAULT_VARIANT_VALUE = "Default";

export interface ProductVariant {
  color: string;
  size: string;
  stock: number;
}

const label = Joi.string().trim().max(50).default(DEFAULT_VARIANT_VALUE);

/** Joi schema for one product variant. */
export const variantSchema = Joi.object({
  color: label,
  size: label,
  stock: Joi.number().integer().min(0).required(),
});

const normalizeLabel = (value: unknown): string => {
  if (typeof value !== "string") {return DEFAULT_VARIANT_VALUE;}
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : DEFAULT_VARIANT_VALUE;
};

/** Normalizes a variant coming from JSON, multipart form data, or a database row. */
export const normalizeVariant = (value: Partial<ProductVariant>): ProductVariant => ({
  color: normalizeLabel(value.color),
  size: normalizeLabel(value.size),
  stock: Number(value.stock) || 0,
});

/** Safely parses the JSON string stored in `Product.variants`. */
export const parseVariants = (raw: string | null | undefined): ProductVariant[] => {
  if (!raw) {return [];}
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {return [];}
    return parsed
      .filter((item): item is Partial<ProductVariant> => Boolean(item) && typeof item === "object")
      .map(normalizeVariant);
  } catch {
    return [];
  }
};

/** Finds the variant matching a color/label pair. */
export const findVariant = (
  variants: ProductVariant[],
  color?: string,
  size?: string,
): ProductVariant | undefined => {
  const wantedColor = normalizeLabel(color);
  const wantedSize = normalizeLabel(size);
  return variants.find(
    (variant) => variant.color === wantedColor && variant.size === wantedSize,
  );
};
