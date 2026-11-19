/** Paymob configuration guard.
 *
 * Paymob is optional so cash-on-delivery deployments boot without it. The guard
 * runs when a Paymob operation is requested, so a card attempt with missing
 * configuration returns one explicit error instead of emitting `undefined` into
 * a provider URL.
 *
 * Region separation is explicit (`PAYMOB_REGION=eg|ksa`). A configured base URL,
 * checkout URL, or regional key prefix that does not match the selected region
 * is rejected. There is no silent fallback between Egypt and Saudi Arabia.
 */
import { env } from "../../../config/env.service.js";

import { PAYMENT_METHOD_CODES, PaymentMethodCode } from "./payment.types.js";

export type PaymobEnvironment = "sandbox" | "live";
export type PaymobRegion = "eg" | "ksa";

export interface PaymobConfig {
  region: PaymobRegion;
  environment: PaymobEnvironment;
  apiKey: string;
  secretKey: string;
  publicKey: string;
  hmacSecret: string;
  baseUrl: string;
  checkoutUrl: string;
  /** Enabled methods only; disabled methods have no usable integration id. */
  methods: Record<PaymentMethodCode, number | null>;
  enabledMethods: PaymentMethodCode[];
  integrationIds: number[];
}

/** Thrown when Paymob is selected but not fully or consistently configured. */
export class PaymobConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymobConfigError";
  }
}

/** Documented regional origins. Test/live mode is chosen by the key, not the URL. */
export const PAYMOB_REGION_ORIGINS: Record<PaymobRegion, string> = {
  eg: "https://accept.paymob.com",
  ksa: "https://ksa.paymob.com",
};

const regionLabel: Record<PaymobRegion, string> = {
  eg: "Egypt",
  ksa: "Saudi Arabia",
};

const requiredVariables = (): Array<[string, string | undefined]> => [
  ["PAYMOB_API_KEY", env.PAYMOB_API_KEY],
  ["PAYMOB_SECRET_KEY", env.PAYMOB_SECRET_KEY],
  ["PAYMOB_PUBLIC_KEY", env.PAYMOB_PUBLIC_KEY],
  ["PAYMOB_HMAC_SECRET", env.PAYMOB_HMAC_SECRET],
];

const integrationVariables = (): Array<[PaymentMethodCode, string, string | undefined]> => [
  ["card", "PAYMOB_INTEGRATION_ID_CARD", env.PAYMOB_INTEGRATION_ID_CARD],
  ["mada", "PAYMOB_INTEGRATION_ID_MADA", env.PAYMOB_INTEGRATION_ID_MADA],
  ["apple_pay", "PAYMOB_INTEGRATION_ID_APPLE_PAY", env.PAYMOB_INTEGRATION_ID_APPLE_PAY],
  ["tabby", "PAYMOB_INTEGRATION_ID_TABBY", env.PAYMOB_INTEGRATION_ID_TABBY],
  ["tamara", "PAYMOB_INTEGRATION_ID_TAMARA", env.PAYMOB_INTEGRATION_ID_TAMARA],
];

export const parsePaymobRegion = (raw: string | undefined): PaymobRegion => {
  const value = (raw ?? "").trim().toLowerCase();
  if (value === "eg" || value === "ksa") {
    return value;
  }
  throw new PaymobConfigError(
    `PAYMOB_REGION must be explicitly set to "eg" or "ksa" (received ${raw ? `"${raw}"` : "nothing"}). ` +
      "There is no default region.",
  );
};

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

const assertRegionOrigin = (name: string, value: string, region: PaymobRegion): string => {
  const normalized = assertUrl(name, value);
  const expected = new URL(PAYMOB_REGION_ORIGINS[region]);
  const actual = new URL(normalized);
  if (actual.origin !== expected.origin) {
    throw new PaymobConfigError(
      `${name} points at ${actual.origin}, which does not match PAYMOB_REGION=${region} ` +
        `(${expected.origin}). Cross-region endpoints are refused.`,
    );
  }
  return normalized;
};

/** Rejects an Egypt key paired with the KSA host (and the reverse). */
const assertKeyRegion = (name: string, value: string, region: PaymobRegion): void => {
  const match = /^(egy|ksa)_/i.exec(value);
  if (!match) {
    return;
  }
  const keyRegion: PaymobRegion = match[1].toLowerCase() === "egy" ? "eg" : "ksa";
  if (keyRegion !== region) {
    throw new PaymobConfigError(
      `${name} belongs to ${regionLabel[keyRegion]} but PAYMOB_REGION is ${region}. ` +
        "Credentials and regional endpoints must never be mixed.",
    );
  }
};

/** Rejects a sandbox key paired with live mode (and the reverse). */
const assertKeyEnvironment = (name: string, value: string, environment: PaymobEnvironment): void => {
  const mode = /_test_/i.test(value) ? "sandbox" : /_live_/i.test(value) ? "live" : null;
  if (mode && mode !== environment) {
    throw new PaymobConfigError(
      `${name} is a ${mode} key but PAYMOB_ENV is "${environment}". ` +
        "Test and production credentials must not be confused.",
    );
  }
};

const readIntegrationId = (name: string, raw: string | undefined): number | null => {
  if (!raw) {
    return null;
  }
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new PaymobConfigError(`${name} must be a positive integer.`);
  }
  return value;
};

/**
 * Methods are enabled only when the merchant explicitly lists them *and* an
 * integration id exists. Apple Pay, Tabby, and Tamara are never enabled merely
 * because a placeholder variable exists.
 */
const readEnabledMethods = (methods: Record<PaymentMethodCode, number | null>): PaymentMethodCode[] => {
  const raw = env.PAYMOB_METHODS_ENABLED?.trim();

  if (!raw) {
    // Safe default: card only, and only when a card integration id exists.
    if (methods.card !== null) {
      return ["card"];
    }
    const first = PAYMENT_METHOD_CODES.find((code) => methods[code] !== null);
    if (!first) {
      throw new PaymobConfigError(
        "Paymob requires at least one configured integration id " +
          "(PAYMOB_INTEGRATION_ID_CARD, PAYMOB_INTEGRATION_ID_MADA, ...).",
      );
    }
    return [first];
  }

  const requested = Array.from(
    new Set(
      raw
        .split(",")
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean),
    ),
  );

  if (requested.length === 0) {
    throw new PaymobConfigError("PAYMOB_METHODS_ENABLED must list at least one payment method.");
  }

  const enabled: PaymentMethodCode[] = [];
  for (const value of requested) {
    if (!(PAYMENT_METHOD_CODES as readonly string[]).includes(value)) {
      throw new PaymobConfigError(
        `PAYMOB_METHODS_ENABLED contains "${value}". Allowed values: ${PAYMENT_METHOD_CODES.join(", ")}.`,
      );
    }
    const code = value as PaymentMethodCode;
    if (methods[code] === null) {
      throw new PaymobConfigError(
        `PAYMOB_METHODS_ENABLED includes "${code}" but its integration id variable is missing. ` +
          "An unconfigured method is never advertised.",
      );
    }
    enabled.push(code);
  }

  return enabled;
};

/**
 * Returns validated Paymob configuration.
 * @throws PaymobConfigError listing every missing variable at once.
 */
export const getPaymobConfig = (): PaymobConfig => {
  const region = parsePaymobRegion(env.PAYMOB_REGION);

  const missing = requiredVariables()
    .filter(([, value]) => !value)
    .map(([name]) => name);
  if (missing.length > 0) {
    throw new PaymobConfigError(
      `PAYMENT_PROVIDER=paymob requires: ${missing.join(", ")}. ` +
        "See config/.env.example and docs/implementation/EXTERNAL_INTEGRATION_BLOCKERS.md.",
    );
  }

  const environment = env.PAYMOB_ENV;
  const secretKey = env.PAYMOB_SECRET_KEY!;
  const publicKey = env.PAYMOB_PUBLIC_KEY!;
  const apiKey = env.PAYMOB_API_KEY!;

  assertKeyRegion("PAYMOB_SECRET_KEY", secretKey, region);
  assertKeyRegion("PAYMOB_PUBLIC_KEY", publicKey, region);
  assertKeyEnvironment("PAYMOB_SECRET_KEY", secretKey, environment);
  assertKeyEnvironment("PAYMOB_PUBLIC_KEY", publicKey, environment);

  const regionOrigin = PAYMOB_REGION_ORIGINS[region];
  const baseUrl = env.PAYMOB_BASE_URL
    ? assertRegionOrigin("PAYMOB_BASE_URL", env.PAYMOB_BASE_URL, region)
    : regionOrigin;
  const checkoutUrl = env.PAYMOB_CHECKOUT_URL
    ? assertRegionOrigin("PAYMOB_CHECKOUT_URL", env.PAYMOB_CHECKOUT_URL, region)
    : `${regionOrigin}/unifiedcheckout`;

  const methods = Object.fromEntries(
    integrationVariables().map(([code, name, raw]) => [code, readIntegrationId(name, raw)]),
  ) as Record<PaymentMethodCode, number | null>;

  const enabledMethods = readEnabledMethods(methods);

  return {
    region,
    environment,
    apiKey,
    secretKey,
    publicKey,
    hmacSecret: env.PAYMOB_HMAC_SECRET!,
    baseUrl: baseUrl.replace(/\/+$/, ""),
    checkoutUrl: checkoutUrl.replace(/\/+$/, ""),
    methods,
    enabledMethods,
    integrationIds: Array.from(new Set(enabledMethods.map((code) => methods[code]!))),
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
