/** Inventory reservation and release for order lines (MVP-09/MVP-19).
 *
 * Product lines reserve their own variant. Bundle lines reserve every component
 * captured in the order snapshot (`cameras`). Requirements are aggregated by
 * product + variant first, so two lines that touch the same variant cannot
 * double-count or release twice.
 *
 * The caller owns the MongoDB transaction. `collectStockRequirements` is pure
 * and unit-tested; `reserveStock` / `releaseStock` only touch the database
 * inside the caller's session.
 */
import { ClientSession } from "mongoose";

import { HttpError } from "../../common/utils/httpError.js";
import { findVariant, parseVariants } from "../../common/validation/variant.js";
import { productModel } from "../../database/model/product.model.js";
import type { OrderLineSnapshot } from "../cart/cart.lines.js";

/** Parses the JSON snapshot stored on the order. Malformed data yields no lines. */
export const parseOrderItems = (raw: string): OrderLineSnapshot[] => {
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as OrderLineSnapshot[]) : [];
  } catch {
    return [];
  }
};

export interface StockRequirement {
  productId: string;
  color: string;
  size: string;
  /** Total units across every order line that touches this variant. */
  quantity: number;
}

const requirementKey = (productId: string, color: string, size: string): string =>
  `${productId}\u0000${color}\u0000${size}`;

/**
 * Flattens order lines into one requirement per product variant.
 * Bundles contribute `cameras[].quantity * line.quantity`.
 */
export const collectStockRequirements = (lines: OrderLineSnapshot[]): StockRequirement[] => {
  const aggregated = new Map<string, StockRequirement>();

  const add = (productId: string, color: string, size: string, quantity: number): void => {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return;
    }
    const key = requirementKey(productId, color, size);
    const existing = aggregated.get(key);
    if (existing) {
      existing.quantity += quantity;
      return;
    }
    aggregated.set(key, { productId, color, size, quantity });
  };

  for (const line of lines) {
    if (line.itemType === "bundle") {
      for (const camera of line.cameras) {
        add(camera.productId, camera.color, camera.size, camera.quantity * line.quantity);
      }
      continue;
    }
    add(line.productId, line.color, line.size, line.quantity);
  }

  return Array.from(aggregated.values());
};

/** Loads a product and its variant, failing loudly on stale order data. */
const loadVariant = async (requirement: StockRequirement, session: ClientSession) => {
  const product = await productModel.findById(requirement.productId).session(session);
  if (!product || !product.isActive) {
    throw new HttpError(
      409,
      `Cannot change stock: product ${requirement.productId} referenced by this order no longer exists or is inactive`,
    );
  }

  const variants = parseVariants(product.variants);
  const variant = findVariant(variants, requirement.color, requirement.size);
  if (!variant) {
    throw new HttpError(
      409,
      `Cannot change stock: variant ${requirement.color}/${requirement.size} of ${product.en_name} no longer exists`,
    );
  }

  return { product, variants, variant };
};

/** Decrements every required variant, throwing before any over-sell. */
export const reserveStock = async (requirements: StockRequirement[], session: ClientSession): Promise<void> => {
  for (const requirement of requirements) {
    const { product, variants, variant } = await loadVariant(requirement, session);

    if (variant.stock < requirement.quantity) {
      throw new HttpError(
        400,
        `Insufficient stock for ${product.en_name} (${variant.color}/${variant.size}). ` +
          `Available: ${variant.stock}, requested: ${requirement.quantity}`,
      );
    }

    variant.stock -= requirement.quantity;
    product.variants = JSON.stringify(variants);
    await product.save({ session });
  }
};

/**
 * Adds reserved stock back. A missing product/variant is a data-integrity
 * failure, not a no-op: silently skipping it would lose inventory with no audit
 * trail.
 */
export const releaseStock = async (requirements: StockRequirement[], session: ClientSession): Promise<void> => {
  for (const requirement of requirements) {
    const { product, variants, variant } = await loadVariant(requirement, session);

    variant.stock += requirement.quantity;
    product.variants = JSON.stringify(variants);
    await product.save({ session });
  }
};
