import { afterEach, describe, expect, it } from "@jest/globals";

import { env } from "../../../config/env.service.js";

import { resetMockPaymentProvider } from "./mock.provider.js";
import { assertPaymentProviderConfig, getPaymentProvider } from "./payment.registry.js";

const originalProvider = env.paymentProvider;
const originalProduction = env.isProduction;

const PAYMOB_KEYS = [
  "PAYMOB_API_KEY",
  "PAYMOB_SECRET_KEY",
  "PAYMOB_PUBLIC_KEY",
  "PAYMOB_HMAC_SECRET",
  "PAYMOB_BASE_URL",
  "PAYMOB_CHECKOUT_URL",
  "PAYMOB_INTEGRATION_ID_CARD",
  "PAYMOB_INTEGRATION_ID_APPLE_PAY",
  "PAYMOB_INTEGRATION_ID_TABBY",
  "PAYMOB_INTEGRATION_ID_TAMARA",
] as const;

const originalPaymob = Object.fromEntries(PAYMOB_KEYS.map((key) => [key, env[key]])) as Record<
  (typeof PAYMOB_KEYS)[number],
  string | undefined
>;

const clearPaymob = (): void => {
  for (const key of PAYMOB_KEYS) {
    env[key] = undefined;
  }
};

const configurePaymob = (): void => {
  env.PAYMOB_API_KEY = "test-api-key";
  env.PAYMOB_SECRET_KEY = "test-secret-key";
  env.PAYMOB_HMAC_SECRET = "test-hmac-secret";
  env.PAYMOB_BASE_URL = "https://accept.paymob.test";
  env.PAYMOB_CHECKOUT_URL = "https://accept.paymob.test/checkout";
  env.PAYMOB_INTEGRATION_ID_CARD = "123456";
};

afterEach(() => {
  env.paymentProvider = originalProvider;
  env.isProduction = originalProduction;
  for (const key of PAYMOB_KEYS) {
    env[key] = originalPaymob[key];
  }
  resetMockPaymentProvider();
});

describe("payment provider registry", () => {
  it("selects the mock adapter from PAYMENT_PROVIDER", () => {
    env.paymentProvider = "mock";
    env.isProduction = false;

    expect(getPaymentProvider().name).toBe("mock");
    expect(() => assertPaymentProviderConfig()).not.toThrow();
  });

  it("rejects an unknown provider with an explicit message", () => {
    expect(() => getPaymentProvider("unknown")).toThrow(/Unknown PAYMENT_PROVIDER/);
  });

  it("refuses to select or boot the mock adapter in production", () => {
    env.paymentProvider = "mock";
    env.isProduction = true;

    expect(() => getPaymentProvider()).toThrow(/development-only/);
    expect(() => assertPaymentProviderConfig()).toThrow(/development-only/);
  });

  it("fails fast when Paymob is selected without configuration", () => {
    env.paymentProvider = "paymob";
    env.isProduction = false;
    clearPaymob();

    expect(() => assertPaymentProviderConfig()).toThrow(/PAYMOB_API_KEY/);
    expect(() => getPaymentProvider()).toThrow(/PAYMOB_API_KEY/);
  });

  it("returns a configured Paymob adapter that refuses unimplemented calls with 503", async () => {
    env.paymentProvider = "paymob";
    env.isProduction = false;
    configurePaymob();

    expect(() => assertPaymentProviderConfig()).not.toThrow();
    const provider = getPaymentProvider();
    expect(provider.name).toBe("paymob");

    await expect(
      provider.createSession({
        orderId: "507f1f77bcf86cd799439011",
        orderNumber: "CCTV-261117-ABCD",
        amountMinor: 12345,
        currency: "SAR",
        items: [],
        notificationUrl: "https://example.test/webhook",
        redirectionUrl: "https://example.test/return",
      }),
    ).rejects.toMatchObject({ status: 503 });
  });
});
