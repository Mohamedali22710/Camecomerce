/** Server-side bundle pricing (MVP-08).
 *
 * Pure functions only: cart, order, and payment must all resolve a bundle through
 * this module so the customer is never charged a client-supplied price. The
 * bundle document is the only price source.
 */
import { HttpError } from "../../common/utils/httpError.js";
import { discountedUnitPrice, roundMoney } from "../../common/utils/pricing.js";

export interface BundleOptionLike {
  code: string;
  labelEn: string;
  labelAr?: string | null;
  priceDelta: number;
  city?: string | null;
}

/** Minimal bundle shape required for pricing; structurally compatible with IBundle. */
export interface BundlePricingSource {
  basePrice: number;
  discount?: number;
  hddOptions: BundleOptionLike[];
  installationOptions: BundleOptionLike[];
}

export interface BundleSelectionInput {
  hddCode: string;
  installationCode: string;
  quantity: number;
}

export interface ResolvedBundleOption {
  code: string;
  labelEn: string;
  labelAr: string | null;
  priceDelta: number;
  city?: string | null;
}

export interface ResolvedBundleSelection {
  hdd: ResolvedBundleOption;
  installation: ResolvedBundleOption;
  basePrice: number;
  discount: number;
  discountAmount: number;
  discountedBasePrice: number;
  unitTotal: number;
  quantity: number;
  lineTotal: number;
}

const safeDelta = (value: number): number => {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
};

const readQuantity = (quantity: number): number => {
  const parsed = Number(quantity);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new HttpError(400, "quantity must be a positive integer");
  }
  return parsed;
};

const readCode = (code: string, field: "hddCode" | "installationCode"): string => {
  const value = typeof code === "string" ? code.trim() : "";
  if (!value) {
    throw new HttpError(400, `${field} is required`);
  }
  return value;
};

const findOption = (options: BundleOptionLike[], code: string, label: "HDD" | "installation"): BundleOptionLike => {
  const option = options.find((entry) => entry.code.trim() === code);
  if (!option) {
    throw new HttpError(400, `Unknown ${label} option code "${code}"`);
  }
  return option;
};

const resolveOption = (option: BundleOptionLike, includeCity: boolean): ResolvedBundleOption => ({
  code: option.code,
  labelEn: option.labelEn,
  labelAr: option.labelAr ?? null,
  priceDelta: safeDelta(option.priceDelta),
  ...(includeCity ? { city: option.city ?? null } : {}),
});

const computeSelectionTotals = (
  bundle: BundlePricingSource,
  hddDelta: number,
  installationDelta: number,
  quantity: number,
) => {
  const basePrice = Math.max(0, Number(bundle.basePrice) || 0);
  const discount = Math.min(100, Math.max(0, Number(bundle.discount) || 0));
  const discountedBasePrice = discountedUnitPrice(basePrice, discount);
  const unitTotal = roundMoney(Math.max(discountedBasePrice, discountedBasePrice + hddDelta + installationDelta));

  return {
    basePrice,
    discount,
    discountAmount: roundMoney(basePrice - discountedBasePrice),
    discountedBasePrice,
    unitTotal,
    quantity,
    lineTotal: roundMoney(unitTotal * quantity),
  };
};

/**
 * Resolves a bundle selection and computes the line total.
 *
 * `unitTotal = discountedBasePrice + hddDelta + installationDelta`, clamped so a
 * negative or malformed delta can never reduce the price below the discounted
 * base. `lineTotal` is rounded once at the end.
 */
export const resolveBundleSelection = (
  bundle: BundlePricingSource,
  selection: BundleSelectionInput,
): ResolvedBundleSelection => {
  const hdd = findOption(bundle.hddOptions, readCode(selection.hddCode, "hddCode"), "HDD");
  const installation = findOption(
    bundle.installationOptions,
    readCode(selection.installationCode, "installationCode"),
    "installation",
  );

  return {
    hdd: resolveOption(hdd, false),
    installation: resolveOption(installation, true),
    ...computeSelectionTotals(
      bundle,
      safeDelta(hdd.priceDelta),
      safeDelta(installation.priceDelta),
      readQuantity(selection.quantity),
    ),
  };
};

/** Discounted base price shown before the customer selects options. */
export const discountedBundleBasePrice = (bundle: Pick<BundlePricingSource, "basePrice" | "discount">): number =>
  discountedUnitPrice(bundle.basePrice, bundle.discount);
