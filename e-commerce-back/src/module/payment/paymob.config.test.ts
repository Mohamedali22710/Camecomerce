import { afterEach, describe, expect, it } from "@jest/globals";

import { env } from "../../../config/env.service.js";

import { getPaymobConfig, isPaymobConfigured, PaymobConfigError } from "./paymob.config.js";

const KEYS = [
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

const original = Object.fromEntries(KEYS.map((key) => [key, env[key]])) as Record<
  (typeof KEYS)[number],
  string | undefined
>;

const clear = (): void => {
  for (const key of KEYS) {
    env[key] = undefined;
  }
};

const valid = (): void => {
  env.PAYMOB_API_KEY = "api-key";
  env.PAYMOB_SECRET_KEY = "secret-key";
  env.PAYMOB_HMAC_SECRET = "hmac-secret";
  env.PAYMOB_BASE_URL = "https://accept.paymob.test/";
  env.PAYMOB_CHECKOUT_URL = "https://accept.paymob.test/checkout";
  env.PAYMOB_INTEGRATION_ID_CARD = "101";
  env.PAYMOB_INTEGRATION_ID_APPLE_PAY = "102";
};

afterEach(() => {
  for (const key of KEYS) {
    env[key] = original[key];
  }
  env.PAYMOB_ENV = "sandbox";
});

describe("getPaymobConfig", () => {
  it("lists every missing required variable at once", () => {
    clear();

    expect(() => getPaymobConfig()).toThrow(PaymobConfigError);
    expect(() => getPaymobConfig()).toThrow(
      /PAYMOB_API_KEY, PAYMOB_SECRET_KEY, PAYMOB_HMAC_SECRET, PAYMOB_BASE_URL, PAYMOB_CHECKOUT_URL/,
    );
  });

  it("returns normalized configuration when complete", () => {
    clear();
    valid();
    env.PAYMOB_ENV = "live";

    const config = getPaymobConfig();

    expect(config).toMatchObject({
      environment: "live",
      apiKey: "api-key",
      baseUrl: "https://accept.paymob.test",
      checkoutUrl: "https://accept.paymob.test/checkout",
      integrationIds: [101, 102],
    });
    expect(isPaymobConfigured()).toBe(true);
  });

  it("rejects a non-absolute base URL instead of putting undefined in a URL", () => {
    clear();
    valid();
    env.PAYMOB_BASE_URL = "accept.paymob.test";

    expect(() => getPaymobConfig()).toThrow(/PAYMOB_BASE_URL must be an absolute URL/);
  });

  it("rejects a non-http(s) checkout URL", () => {
    clear();
    valid();
    env.PAYMOB_CHECKOUT_URL = "ftp://accept.paymob.test/checkout";

    expect(() => getPaymobConfig()).toThrow(/must use http or https/);
  });

  it("requires at least one integration id", () => {
    clear();
    valid();
    env.PAYMOB_INTEGRATION_ID_CARD = undefined;
    env.PAYMOB_INTEGRATION_ID_APPLE_PAY = undefined;

    expect(() => getPaymobConfig()).toThrow(/at least one integration id/);
  });

  it("rejects a non-integer integration id", () => {
    clear();
    valid();
    env.PAYMOB_INTEGRATION_ID_CARD = "12.5";

    expect(() => getPaymobConfig()).toThrow(/must be a positive integer/);
  });

  it("reports not configured instead of throwing from isPaymobConfigured", () => {
    clear();
    expect(isPaymobConfigured()).toBe(false);
  });
});
