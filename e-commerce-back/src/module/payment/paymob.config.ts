/** Paymob configuration guard (MVP-12).
 *
 * Paymob is optional so cash-on-delivery deployments boot without it. The guard
 * is required only when `PAYMENT_PROVIDER=paymob`, and it fails with one explicit
 * message instead of emitting `undefined` into a provider URL.
 *
 * The endpoint/version and credential set are still UNCONFIRMED (MVP-03 /
 * MVP-13 are blocked). This module therefore validates and shapes configuration
 * only; it performs no network calls.
 */
import { env } from "../../../config/env.service.js";

export type PaymobEnvironment = "sandbox" | "live";

export interface PaymobConfig {
  environment: PaymobEnvironment;
  apiKey: string;
  secretKey: string;
  publicKey: string | null;
  hmacSecret: string;
  baseUrl: string;
  checkoutUrl: string;
  integrationIds: number[];
}

/** Thrown when Paymob is selected but not fully configured. */
export class PaymobConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymobConfigError";
  }
}

const requiredVariables = (): Array<[string, string | undefined]> => [
  ["PAYMOB_API_KEY", env.PAYMOB_API_KEY],
  ["PAYMOB_SECRET_KEY", env.PAYMOB_SECRET_KEY],
  ["PAYMOB_HMAC_SECRET", env.PAYMOB_HMAC_SECRET],
  ["PAYMOB_BASE_URL", env.PAYMOB_BASE_URL],
  ["PAYMOB_CHECKOUT_URL", env.PAYMOB_CHECKOUT_URL],
];

const integrationVariables = (): Array<[string, string | undefined]> => [
  ["PAYMOB_INTEGRATION_ID_CARD", env.PAYMOB_INTEGRATION_ID_CARD],
  ["PAYMOB_INTEGRATION_ID_APPLE_PAY", env.PAYMOB_INTEGRATION_ID_APPLE_PAY],
  ["PAYMOB_INTEGRATION_ID_TABBY", env.PAYMOB_INTEGRATION_ID_TABBY],
  ["PAYMOB_INTEGRATION_ID_TAMARA", env.PAYMOB_INTEGRATION_ID_TAMARA],
];

/** Paymob requires an absolute http(s) URL; a bare host would break redirects. */
const assertUrl = (name: string, value: string): string => {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new PaymobConfigError(`${name} must be an absolute URL (received an invalid value).`);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new PaymobConfigError(`${name} must use http or https.`);
  }
  return value.replace(/\/+$/, "");
};

const readIntegrationIds = (): number[] => {
  const ids: number[] = [];
  const variables = integrationVariables();

  for (const [name, raw] of variables) {
    if (!raw) {
      continue;
    }
    const value = Number(raw);
    if (!Number.isInteger(value) || value <= 0) {
      throw new PaymobConfigError(`${name} must be a positive integer.`);
    }
    ids.push(value);
  }

  if (ids.length === 0) {
    throw new PaymobConfigError(
      "Paymob requires at least one integration id " + `(${variables.map(([name]) => name).join(", ")}).`,
    );
  }

  return ids;
};

/**
 * Returns validated Paymob configuration.
 * @throws PaymobConfigError listing every missing variable at once.
 */
export const getPaymobConfig = (): PaymobConfig => {
  const missing = requiredVariables()
    .filter(([, value]) => !value)
    .map(([name]) => name);
  if (missing.length > 0) {
    throw new PaymobConfigError(
      `PAYMENT_PROVIDER=paymob requires: ${missing.join(", ")}. ` +
        "See config/.env.example and docs/implementation/EXTERNAL_INTEGRATION_BLOCKERS.md.",
    );
  }

  return {
    environment: env.PAYMOB_ENV,
    apiKey: env.PAYMOB_API_KEY!,
    secretKey: env.PAYMOB_SECRET_KEY!,
    publicKey: env.PAYMOB_PUBLIC_KEY || null,
    hmacSecret: env.PAYMOB_HMAC_SECRET!,
    baseUrl: assertUrl("PAYMOB_BASE_URL", env.PAYMOB_BASE_URL!),
    checkoutUrl: assertUrl("PAYMOB_CHECKOUT_URL", env.PAYMOB_CHECKOUT_URL!),
    integrationIds: readIntegrationIds(),
  };
};

/** True when every required Paymob value (including one integration id) is set. */
export const isPaymobConfigured = (): boolean => {
  try {
    getPaymobConfig();
    return true;
  } catch {
    return false;
  }
};
