/** Money conversion helpers (MVP-12).
 *
 * Payment providers expect integer minor units (halalas for SAR). Converting at
 * the provider boundary avoids sending `SAR` decimals and eliminates a class of
 * 100x amount errors.
 */
import { HttpError } from "./httpError.js";

const MINOR_UNITS_PER_MAJOR = 100;

const assertFiniteNonNegative = (value: number, field: string): void => {
  if (!Number.isFinite(value) || value < 0) {
    throw new HttpError(400, `${field} must be a non-negative finite number`);
  }
};

/** Converts a major-unit amount (SAR) to integer minor units (halalas). */
export const toMinorUnits = (amount: number): number => {
  assertFiniteNonNegative(amount, "amount");
  // Number.EPSILON keeps values such as 0.1 + 0.2 from rounding down.
  return Math.round((amount + Number.EPSILON) * MINOR_UNITS_PER_MAJOR);
};

/** Converts integer minor units (halalas) back to major units (SAR). */
export const fromMinorUnits = (minorUnits: number): number => {
  if (!Number.isInteger(minorUnits) || minorUnits < 0) {
    throw new HttpError(400, "minorUnits must be a non-negative integer");
  }
  return Math.round((minorUnits / MINOR_UNITS_PER_MAJOR + Number.EPSILON) * 100) / 100;
};
