/** Payment provider registry (MVP-02/MVP-12).
 *
 * Selects the active adapter from `PAYMENT_PROVIDER`. This is the only place the
 * order flow resolves a provider: `createOrder` calls `getPaymentProvider()` and
 * never imports a provider SDK. Selection is explicit and has no implicit
 * fallback. Paymob configuration is checked when a Paymob operation runs, so
 * COD-only deployments boot without Paymob credentials and a card attempt gets
 * an explicit `503` while the integration is unconfirmed (MVP-13/MVP-15).
 * Stripe is available only as the legacy rollback adapter.
 */
import { env } from "../../../config/env.service.js";

import { mockPaymentProvider } from "./mock.provider.js";
import { PaymentProvider, PaymentProviderName } from "./payment.types.js";
import { paymobPaymentProvider } from "./paymob.provider.js";
import { stripePaymentProvider } from "./stripe.provider.js";

const KNOWN_PROVIDERS: readonly PaymentProviderName[] = ["paymob", "mock", "stripe"];

export const isPaymentProviderName = (value: string): value is PaymentProviderName =>
  (KNOWN_PROVIDERS as readonly string[]).includes(value);

const assertMockNotInProduction = (providerName: PaymentProviderName): void => {
  if (env.isProduction && providerName === "mock") {
    throw new Error("PAYMENT_PROVIDER=mock is development-only and is refused when NODE_ENV=production.");
  }
};

/**
 * Fails fast when provider selection is unsafe or invalid, but never requires
 * credentials that the current deployment does not use:
 *
 * - `PAYMENT_PROVIDER` unset: production must choose explicitly; development and
 *   test boot with card checkout disabled (COD still works).
 * - `mock`: refused in production.
 * - unknown value: refused everywhere.
 * - Paymob credentials are validated when a Paymob operation runs, not at boot,
 *   so a COD-only deployment never needs them. A misconfigured Paymob card
 *   attempt returns the adapter's explicit `503`.
 */
export const assertPaymentProviderConfig = (): void => {
  if (!env.paymentProvider) {
    if (env.isProduction) {
      throw new Error(
        'PAYMENT_PROVIDER is required in production. Set it explicitly to "paymob" or "stripe".',
      );
    }

    console.warn(
      "PAYMENT_PROVIDER is not set: card checkout returns 503 until it is configured. " +
        "COD orders still work. Use PAYMENT_PROVIDER=mock for local card development.",
    );
    return;
  }

  if (!isPaymentProviderName(env.paymentProvider)) {
    throw new Error(
      `Unknown PAYMENT_PROVIDER "${env.paymentProvider}". Expected one of: ${KNOWN_PROVIDERS.join(", ")}.`,
    );
  }
  assertMockNotInProduction(env.paymentProvider);
};

/** Resolves a payment adapter. Never falls back to another provider. */
export const getPaymentProvider = (providerName?: string): PaymentProvider => {
  const name = (providerName ?? env.paymentProvider)?.trim().toLowerCase();

  if (!name) {
    throw new Error(
      "PAYMENT_PROVIDER is not set. Card checkout requires an explicit provider " +
        "(paymob or stripe; mock only outside production).",
    );
  }
  if (!isPaymentProviderName(name)) {
    throw new Error(`Unknown PAYMENT_PROVIDER "${name}". Expected one of: ${KNOWN_PROVIDERS.join(", ")}.`);
  }
  assertMockNotInProduction(name);

  switch (name) {
    case "mock":
      return mockPaymentProvider;
    case "paymob":
      // Credentials are validated per operation in the adapter. Returning the
      // stub here keeps boot independent of Paymob, without ever falling back.
      return paymobPaymentProvider;
    case "stripe":
      // Legacy rollback adapter. Webhooks stay on /v1/order/webhook.
      return stripePaymentProvider;
  }
};
