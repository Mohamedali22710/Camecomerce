/** Payment method capability gating (MVP-20).
 *
 * The storefront may only offer methods the merchant has actually activated.
 * Availability is derived from the explicit `PAYMOB_METHODS_ENABLED` list plus a
 * configured integration id, never from documentation or a guess.
 *
 * Neither this module nor its HTTP response exposes integration ids, keys, or
 * secrets.
 */
import { env } from "../../../config/env.service.js";
import { HttpError } from "../../common/utils/httpError.js";

import { PAYMENT_METHOD_CODES, PaymentMethodCode } from "./payment.types.js";
import { getPaymobConfig, PaymobConfigError } from "./paymob.config.js";

export const PAYMENT_METHOD_LABELS: Record<PaymentMethodCode, string> = {
  card: "Credit / debit card",
  mada: "Mada",
  apple_pay: "Apple Pay",
  tabby: "Tabby",
  tamara: "Tamara",
};

export interface EnabledMethods {
  /** Cash on delivery is always available and is not a Paymob method. */
  cod: true;
  provider: string | null;
  region: string | null;
  environment: string | null;
  methods: Array<{ code: PaymentMethodCode; label: string }>;
}

const isMethodCode = (value: string): value is PaymentMethodCode =>
  (PAYMENT_METHOD_CODES as readonly string[]).includes(value);

/**
 * Public capability list. A configuration error returns an empty online list
 * instead of throwing, so the storefront can still offer COD.
 */
export const listEnabledPaymentMethods = (): EnabledMethods => {
  const provider = env.paymentProvider ?? null;

  if (provider === "mock") {
    return {
      cod: true,
      provider: "mock",
      region: null,
      environment: null,
      methods: [{ code: "card", label: PAYMENT_METHOD_LABELS.card }],
    };
  }

  if (provider !== "paymob") {
    return { cod: true, provider, region: null, environment: null, methods: [] };
  }

  try {
    const config = getPaymobConfig();
    return {
      cod: true,
      provider: "paymob",
      region: config.region,
      environment: config.environment,
      methods: config.enabledMethods.map((code) => ({ code, label: PAYMENT_METHOD_LABELS[code] })),
    };
  } catch {
    return { cod: true, provider: "paymob", region: env.PAYMOB_REGION ?? null, environment: null, methods: [] };
  }
};

/**
 * Validates a requested online method before an order or session is created.
 * A missing/invalid Paymob configuration is a `503` (nothing was charged), while
 * an activated-list mismatch is a `400` (the client asked for the wrong thing).
 */
export const assertPaymentMethodEnabled = (method: string): PaymentMethodCode => {
  const code = (method || "card").trim().toLowerCase();
  if (!isMethodCode(code)) {
    throw new HttpError(400, `Unknown payment method "${method}". Allowed: ${PAYMENT_METHOD_CODES.join(", ")}.`);
  }

  if (env.paymentProvider === "mock") {
    if (code !== "card") {
      throw new HttpError(400, `Payment method "${code}" is not enabled. Enabled methods: card.`);
    }
    return code;
  }

  let config;
  try {
    config = getPaymobConfig();
  } catch (error) {
    if (error instanceof PaymobConfigError) {
      throw new HttpError(503, `${error.message} No payment was taken.`);
    }
    throw error;
  }

  if (!config.enabledMethods.includes(code)) {
    throw new HttpError(
      400,
      `Payment method "${code}" is not enabled for this merchant. ` +
        `Enabled methods: ${config.enabledMethods.join(", ")}.`,
    );
  }

  return code;
};
