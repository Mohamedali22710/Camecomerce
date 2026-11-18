/** Human-readable order number generation (MVP-11). */
import { randomInt } from "node:crypto";

export const ORDER_NUMBER_PREFIX = "CCTV";
export const ORDER_NUMBER_PATTERN = /^CCTV-\d{6}-[A-Z0-9]{4}$/;

const pad2 = (value: number): string => String(value).padStart(2, "0");

const normalizeSuffix = (value: string): string => {
  const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return cleaned.slice(-4).padStart(4, "0");
};

const randomSuffix = (): string =>
  randomInt(0, 36 ** 4)
    .toString(36)
    .toUpperCase()
    .padStart(4, "0");

/**
 * Creates `CCTV-YYMMDD-XXXX` using UTC. `suffix` is injectable so collisions and
 * formatting can be tested deterministically.
 */
export const generateOrderNumber = (date: Date = new Date(), suffix: () => string = randomSuffix): string => {
  const year = date.getUTCFullYear().toString().slice(-2);
  const month = pad2(date.getUTCMonth() + 1);
  const day = pad2(date.getUTCDate());
  return `${ORDER_NUMBER_PREFIX}-${year}${month}${day}-${normalizeSuffix(suffix())}`;
};

/**
 * Display-only fallback for legacy orders created before MVP-11. It is never
 * persisted and cannot collide with a generated number because of the `LEGACY`
 * segment.
 */
export const legacyOrderNumber = (orderId: string): string =>
  `CCTV-LEGACY-${
    String(orderId)
      .replace(/[^a-fA-F0-9]/g, "")
      .slice(-8)
      .toUpperCase() || "UNKNOWN"
  }`;
