/** Payment provider registry (MVP-02/MVP-12).
 *
 * Selects the active adapter from `PAYMENT_PROVIDER`. Paymob configuration is
 * validated at boot when selected; the adapter itself still returns an explicit
 * `503` because session/HMAC endpoints are unconfirmed (MVP-13/MVP-15). The
 * legacy Stripe order path stays wired directly in `order.service.ts`.
 */
import { env } from "../../../config/env.service.js";

import { mockPaymentProvider } from "./mock.provider.js";
import { PaymentProvider, PaymentProviderName } from "./payment.types.js";
import { getPaymobConfig } from "./paymob.config.js";
import { paymobPaymentProvider } from "./paymob.provider.js";

const KNOWN_PROVIDERS: readonly PaymentProviderName[] = ["paymob", "mock", "stripe"];

export const isPaymentProviderName = (value: string): value is PaymentProviderName =>
  (KNOWN_PROVIDERS as readonly string[]).includes(value);

const assertMockNotInProduction = (providerName: PaymentProviderName): void => {
  if (env.isProduction && providerName === "mock") {
    throw new Error("PAYMENT_PROVIDER=mock is development-only and is refused when NODE_ENV=production.");
  }
};

/**
 * Fails fast at boot when the configured provider is unknown, when the mock
 * adapter is requested in production, or when Paymob is selected without its
 * required configuration. Called from `src/index.ts`.
 */
export const assertPaymentProviderConfig = (): void => {
  if (!isPaymentProviderName(env.paymentProvider)) {
    throw new Error(
      `Unknown PAYMENT_PROVIDER "${env.paymentProvider}". Expected one of: ${KNOWN_PROVIDERS.join(", ")}.`,
    );
  }
  assertMockNotInProduction(env.paymentProvider);

  if (env.paymentProvider === "paymob") {
    // Throws PaymobConfigError with the full missing-variable list.
    getPaymobConfig();
  }
};

/** Resolves a payment adapter. Throws a configuration error when unavailable. */
export const getPaymentProvider = (providerName: string = env.paymentProvider): PaymentProvider => {
  if (!isPaymentProviderName(providerName)) {
    throw new Error(`Unknown PAYMENT_PROVIDER "${providerName}". Expected one of: ${KNOWN_PROVIDERS.join(", ")}.`);
  }
  assertMockNotInProduction(providerName);

  switch (providerName) {
    case "mock":
      return mockPaymentProvider;
    case "paymob":
      // Validate now so an unconfigured adapter is never returned.
      getPaymobConfig();
      return paymobPaymentProvider;
    case "stripe":
      throw new Error(
        "PAYMENT_PROVIDER=stripe is the legacy order-path provider and is not exposed through the " +
          "payment registry. Existing Stripe checkout remains unchanged until the provider migration.",
      );
  }
};
