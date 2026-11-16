/** Payment provider registry (MVP-02).
 *
 * Selects the active adapter from `PAYMENT_PROVIDER`. Only the mock adapter is
 * implemented in this ticket; Paymob arrives in MVP-12/MVP-13 and the legacy
 * Stripe path remains wired directly in `order.service.ts` until then.
 */
import { env } from "../../../config/env.service.js";

import { mockPaymentProvider } from "./mock.provider.js";
import { PaymentProvider, PaymentProviderName } from "./payment.types.js";

const KNOWN_PROVIDERS: readonly PaymentProviderName[] = ["paymob", "mock", "stripe"];

export const isPaymentProviderName = (value: string): value is PaymentProviderName =>
  (KNOWN_PROVIDERS as readonly string[]).includes(value);

const assertMockNotInProduction = (providerName: PaymentProviderName): void => {
  if (env.isProduction && providerName === "mock") {
    throw new Error("PAYMENT_PROVIDER=mock is development-only and is refused when NODE_ENV=production.");
  }
};

/**
 * Fails fast at boot when the configured provider is unknown or when the mock
 * adapter is requested in production. Called from `src/index.ts`.
 */
export const assertPaymentProviderConfig = (): void => {
  if (!isPaymentProviderName(env.paymentProvider)) {
    throw new Error(
      `Unknown PAYMENT_PROVIDER "${env.paymentProvider}". Expected one of: ${KNOWN_PROVIDERS.join(", ")}.`,
    );
  }
  assertMockNotInProduction(env.paymentProvider);
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
      throw new Error(
        "PAYMENT_PROVIDER=paymob is not implemented yet (MVP-12/MVP-13). " +
          "Keep the mock adapter for development and see docs/implementation/EXTERNAL_INTEGRATION_BLOCKERS.md.",
      );
    case "stripe":
      throw new Error(
        "PAYMENT_PROVIDER=stripe is the legacy order-path provider and is not exposed through the " +
          "payment registry. Existing Stripe checkout remains unchanged until the provider migration.",
      );
  }
};
