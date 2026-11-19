import { afterEach, describe, expect, it } from "@jest/globals";

import { env } from "../../../config/env.service.js";

import { getPaymobConfig, isPaymobConfigured, PaymobConfigError } from "./paymob.config.js";

const KEYS = [
  "PAYMOB_REGION",
  "PAYMOB_API_KEY",
  "PAYMOB_SECRET_KEY",
  "PAYMOB_PUBLIC_KEY",
  "PAYMOB_HMAC_SECRET",
  "PAYMOB_BASE_URL",
  "PAYMOB_CHECKOUT_URL",
  "PAYMOB_INTEGRATION_ID_CARD",
  "PAYMOB_INTEGRATION_ID_MADA",
  "PAYMOB_INTEGRATION_ID_APPLE_PAY",
  "PAYMOB_INTEGRATION_ID_TABBY",
  "PAYMOB_INTEGRATION_ID_TAMARA",
  "PAYMOB_METHODS_ENABLED",
] as const;

const original = Object.fromEntries(KEYS.map((key) => [key, env[key]])) as Record<
  (typeof KEYS)[number],
  string | undefined
>;

const clear = (): void => {
  for (const key of KEYS) {
    env[key] = undefined;
  }
  env.PAYMOB_ENV = "sandbox";
};

const valid = (): void => {
  env.PAYMOB_REGION = "eg";
  env.PAYMOB_ENV = "sandbox";
  env.PAYMOB_API_KEY = "api-key";
  env.PAYMOB_SECRET_KEY = "secret-key";
  env.PAYMOB_PUBLIC_KEY = "public-key";
  env.PAYMOB_HMAC_SECRET = "hmac-secret";
  env.PAYMOB_BASE_URL = undefined;
  env.PAYMOB_CHECKOUT_URL = undefined;
  env.PAYMOB_INTEGRATION_ID_CARD = "101";
  env.PAYMOB_INTEGRATION_ID_MADA = undefined;
  env.PAYMOB_INTEGRATION_ID_APPLE_PAY = undefined;
  env.PAYMOB_INTEGRATION_ID_TABBY = undefined;
  env.PAYMOB_INTEGRATION_ID_TAMARA = undefined;
  env.PAYMOB_METHODS_ENABLED = undefined;
};

afterEach(() => {
  for (const key of KEYS) {
    env[key] = original[key];
  }
  env.PAYMOB_ENV = "sandbox";
});

describe("getPaymobConfig", () => {
  it("requires an explicit region; there is no default", () => {
    clear();
    expect(() => getPaymobConfig()).toThrow(PaymobConfigError);
    expect(() => getPaymobConfig()).toThrow(/PAYMOB_REGION must be explicitly set/);
  });

  it("lists every missing required variable at once", () => {
    clear();
    env.PAYMOB_REGION = "eg";

    expect(() => getPaymobConfig()).toThrow(
      /PAYMOB_API_KEY, PAYMOB_SECRET_KEY, PAYMOB_PUBLIC_KEY, PAYMOB_HMAC_SECRET/,
    );
  });

  it("returns normalized Egypt configuration with documented defaults", () => {
    clear();
    valid();

    const config = getPaymobConfig();

    expect(config).toMatchObject({
      region: "eg",
      environment: "sandbox",
      baseUrl: "https://accept.paymob.com",
      checkoutUrl: "https://accept.paymob.com/unifiedcheckout",
      methods: { card: 101, mada: null, apple_pay: null, tabby: null, tamara: null },
      enabledMethods: ["card"],
      integrationIds: [101],
    });
    expect(isPaymobConfigured()).toBe(true);
  });

  it("accepts the KSA origin only when the region is ksa", () => {
    clear();
    valid();
    env.PAYMOB_REGION = "ksa";

    expect(getPaymobConfig().baseUrl).toBe("https://ksa.paymob.com");
  });

  it("refuses a cross-region base URL", () => {
    clear();
    valid();
    env.PAYMOB_REGION = "ksa";
    env.PAYMOB_BASE_URL = "https://accept.paymob.com";

    expect(() => getPaymobConfig()).toThrow(/does not match PAYMOB_REGION=ksa/);
  });

  it("refuses a cross-region key prefix", () => {
    clear();
    valid();
    env.PAYMOB_SECRET_KEY = "ksa_sk_test_123";

    expect(() => getPaymobConfig()).toThrow(/belongs to Saudi Arabia but PAYMOB_REGION is eg/);
  });

  it("refuses a sandbox key in live mode", () => {
    clear();
    valid();
    env.PAYMOB_ENV = "live";
    env.PAYMOB_SECRET_KEY = "egy_sk_test_123";

    expect(() => getPaymobConfig()).toThrow(/is a sandbox key but PAYMOB_ENV is "live"/);
  });

  it("rejects a non-absolute base URL instead of putting undefined in a URL", () => {
    clear();
    valid();
    env.PAYMOB_BASE_URL = "accept.paymob.com";

    expect(() => getPaymobConfig()).toThrow(/PAYMOB_BASE_URL must be an absolute URL/);
  });

  it("rejects a non-http(s) checkout URL", () => {
    clear();
    valid();
    env.PAYMOB_CHECKOUT_URL = "ftp://accept.paymob.com/checkout";

    expect(() => getPaymobConfig()).toThrow(/must use http or https/);
  });

  it("requires at least one integration id", () => {
    clear();
    valid();
    env.PAYMOB_INTEGRATION_ID_CARD = undefined;

    expect(() => getPaymobConfig()).toThrow(/at least one configured integration id/);
  });

  it("enables only explicitly listed methods that also have an integration id", () => {
    clear();
    valid();
    env.PAYMOB_INTEGRATION_ID_APPLE_PAY = "202";
    env.PAYMOB_METHODS_ENABLED = "card,apple_pay";

    expect(getPaymobConfig().enabledMethods).toEqual(["card", "apple_pay"]);
  });

  it("refuses to advertise a method without an integration id", () => {
    clear();
    valid();
    env.PAYMOB_METHODS_ENABLED = "card,tabby";

    expect(() => getPaymobConfig()).toThrow(/includes "tabby" but its integration id variable is missing/);
  });

  it("refuses an unknown method code", () => {
    clear();
    valid();
    env.PAYMOB_METHODS_ENABLED = "card,bitcoin";

    expect(() => getPaymobConfig()).toThrow(/PAYMOB_METHODS_ENABLED contains "bitcoin"/);
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
