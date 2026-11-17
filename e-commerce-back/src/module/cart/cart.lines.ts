/** Shared cart/order line resolution (MVP-09).
 *
 * Both the cart and order creation use these functions so the price shown in the
 * cart is exactly the price stored on the order. Client-supplied prices are
 * never part of the input contract.
 *
 * Bundle inventory is intentionally absent: DEC-01 is unresolved, so a bundle
 * line reports `availabilityUnknown: true` and never claims stock.
 */
import { HttpError } from "../../common/utils/httpError.js";
import { discountedUnitPrice, roundMoney } from "../../common/utils/pricing.js";
import { findVariant, parseVariants, ProductVariant } from "../../common/validation/variant.js";
import { IBundle, IBundleComponent } from "../../database/model/bundle.model.js";
import { IProduct } from "../../database/model/product.model.js";
import { resolveBundleSelection, ResolvedBundleSelection } from "../bundle/bundle.pricing.js";

export interface ProductLineInput {
  itemType?: "product";
  productId?: string;
  color?: string;
  size?: string;
  quantity: number;
}

export interface BundleLineInput {
  itemType: "bundle";
  bundleId?: string;
  hddOption?: string;
  installationOption?: string;
  quantity: number;
}

export type CartLineInput = ProductLineInput | BundleLineInput;

export interface ResolvedProductLine {
  itemType: "product";
  productId: string;
  product: IProduct;
  variant: ProductVariant;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  available: boolean;
  stock: number;
  availabilityUnknown: false;
}

export interface ResolvedBundleLine {
  itemType: "bundle";
  bundleId: string;
  bundle: IBundle;
  selection: ResolvedBundleSelection;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  available: boolean;
  stock: null;
  availabilityUnknown: true;
}

export interface ProductOrderSnapshot {
  itemType: "product";
  productId: string;
  quantity: number;
  price: number;
  lineTotal: number;
  en_name: string;
  ar_name?: string | null;
  fr_name?: string | null;
  color: string;
  size: string;
}

export interface BundleOrderSnapshot {
  itemType: "bundle";
  bundleId: string;
  bundleCode: string;
  en_name: string;
  ar_name?: string | null;
  fr_name?: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  hdd: {
    code: string;
    labelEn: string;
    labelAr: string | null;
    priceDelta: number;
  };
  installation: {
    code: string;
    labelEn: string;
    labelAr: string | null;
    priceDelta: number;
    city?: string | null;
  };
  cameras: {
    productId: string;
    color: string;
    size: string;
    quantity: number;
  }[];
}

export type OrderLineSnapshot = ProductOrderSnapshot | BundleOrderSnapshot;

export interface ResolveProductOptions {
  /** When true, insufficient stock throws 400 instead of being reported. */
  enforceStock?: boolean;
  /** Set false for read-only cart rendering of an inactive product. */
  enforceAvailability?: boolean;
}

const readQuantity = (quantity: number): number => {
  const parsed = Number(quantity);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new HttpError(400, "quantity must be a positive integer");
  }
  return parsed;
};

const readOptionCode = (value: string | undefined, field: string): string => {
  const code = typeof value === "string" ? value.trim() : "";
  if (!code) {
    throw new HttpError(400, `${field} is required for a bundle line`);
  }
  return code;
};

/** Resolves a product variant line from the stored product. */
export const resolveProductLine = (
  product: IProduct,
  input: ProductLineInput,
  options: ResolveProductOptions = {},
): ResolvedProductLine => {
  const quantity = readQuantity(input.quantity);
  const variants = parseVariants(product.variants);
  const variant = findVariant(variants, input.color, input.size);

  if (!variant) {
    throw new HttpError(
      400,
      `Variant ${input.color || "Default"}/${input.size || "Default"} not found for ${product.en_name}`,
    );
  }
  if (options.enforceAvailability !== false && !product.isActive) {
    throw new HttpError(400, `${product.en_name} is no longer available`);
  }
  if (options.enforceStock && variant.stock < quantity) {
    throw new HttpError(
      400,
      `Insufficient stock for ${product.en_name} (${variant.color}/${variant.size}). Available: ${variant.stock}, requested: ${quantity}`,
    );
  }

  const unitPrice = discountedUnitPrice(product.price, product.discount);
  return {
    itemType: "product",
    productId: String(product._id),
    product,
    variant,
    quantity,
    unitPrice,
    lineTotal: roundMoney(unitPrice * quantity),
    available: product.isActive && variant.stock >= quantity,
    stock: variant.stock,
    availabilityUnknown: false,
  };
};

/** Resolves a bundle selection against the stored bundle configuration. */
export const resolveBundleLine = (bundle: IBundle, input: BundleLineInput): ResolvedBundleLine => {
  const quantity = readQuantity(input.quantity);
  const selection = resolveBundleSelection(bundle, {
    hddCode: readOptionCode(input.hddOption, "hddOption"),
    installationCode: readOptionCode(input.installationOption, "installationOption"),
    quantity,
  });

  if (!bundle.isActive) {
    throw new HttpError(400, `${bundle.en_name} is no longer available`);
  }

  return {
    itemType: "bundle",
    bundleId: String(bundle._id),
    bundle,
    selection,
    quantity,
    unitPrice: selection.unitTotal,
    lineTotal: selection.lineTotal,
    available: true,
    stock: null,
    availabilityUnknown: true,
  };
};

export const toProductSnapshot = (line: ResolvedProductLine): ProductOrderSnapshot => ({
  itemType: "product",
  productId: line.productId,
  quantity: line.quantity,
  price: line.unitPrice,
  lineTotal: line.lineTotal,
  en_name: line.product.en_name,
  ar_name: line.product.ar_name,
  fr_name: line.product.fr_name,
  color: line.variant.color,
  size: line.variant.size,
});

const snapshotCamera = (camera: IBundleComponent) => ({
  productId: String(camera.productId),
  color: camera.color,
  size: camera.size,
  quantity: camera.quantity,
});

export const toBundleSnapshot = (line: ResolvedBundleLine): BundleOrderSnapshot => ({
  itemType: "bundle",
  bundleId: line.bundleId,
  bundleCode: line.bundle.code,
  en_name: line.bundle.en_name,
  ar_name: line.bundle.ar_name,
  fr_name: null,
  quantity: line.quantity,
  unitPrice: line.unitPrice,
  lineTotal: line.lineTotal,
  hdd: {
    code: line.selection.hdd.code,
    labelEn: line.selection.hdd.labelEn,
    labelAr: line.selection.hdd.labelAr,
    priceDelta: line.selection.hdd.priceDelta,
  },
  installation: {
    code: line.selection.installation.code,
    labelEn: line.selection.installation.labelEn,
    labelAr: line.selection.installation.labelAr,
    priceDelta: line.selection.installation.priceDelta,
    city: line.selection.installation.city ?? null,
  },
  cameras: line.bundle.cameras.map(snapshotCamera),
});

/** Sums already-rounded line totals so mixed product/bundle carts agree. */
export const sumLineTotals = (lines: { lineTotal: number }[]): number =>
  roundMoney(lines.reduce((total, line) => total + line.lineTotal, 0));
