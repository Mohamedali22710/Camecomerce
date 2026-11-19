import { afterEach, describe, expect, it } from "@jest/globals";

import { env } from "../../../config/env.service.js";

import { assertPaymentMethodEnabled, listEnabledPaymentMethods } from "./payment.methods.js";

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
const originalProvider = env.paymentProvider;

const configure = (): void => {
  env.paymentProvider = "paymob";
  env.PAYMOB_REGION = "eg";
  env.PAYMOB_ENV = "sandbox";
  env.PAYMOB_API_KEY = "api-key";
  env.PAYMOB_SECRET_KEY = "secret-key";
  env.PAYMOB_PUBLIC_KEY = "public-key";
  env.PAYMOB_HMAC_SECRET = "hmac-secret";
  env.PAYMOB_BASE_URL = undefined;
  env.PAYMOB_CHECKOUT_URL = undefined;
  env.PAYMOB_INTEGRATION_ID_CARD = "101";
  env.PAYMOB_INTEGRATION_ID_MADA = "102";
  env.PAYMOB_METHODS_ENABLED = "card";
};

afterEach(() => {
  env.paymentProvider = originalProvider;
  for (const key of KEYS) {
    env[key] = original[key];
  }
  env.PAYMOB_ENV = "sandbox";
});

describe("listEnabledPaymentMethods", () => {
  it("always offers COD and only card for the mock adapter", () => {
    env.paymentProvider = "mock";
    const methods = listEnabledPaymentMethods();

    expect(methods).toMatchObject({
      cod: true,
      provider: "mock",
      methods: [{ code: "card", label: "Credit / debit card" }],
    });
  });

  it("returns no online methods when no provider is selected", () => {
    env.paymentProvider = undefined;
    expect(listEnabledPaymentMethods()).toMatchObject({ cod: true, provider: null, methods: [] });
  });

  it("returns only merchant-enabled methods with integration ids", () => {
    configure();
    env.PAYMOB_METHODS_ENABLED = "card,mada";

    expect(listEnabledPaymentMethods()).toMatchObject({
      cod: true,
      provider: "paymob",
      region: "eg",
      environment: "sandbox",
      methods: [
        { code: "card", label: "Credit / debit card" },
        { code: "mada", label: "Mada" },
      ],
    });
  });

  it("never leaks integration ids, keys, or secrets", () => {
    configure();
    const serialized = JSON.stringify(listEnabledPaymentMethods());

    for (const secret of ["api-key", "secret-key", "public-key", "hmac-secret", "101", "102"]) {
      expect(serialized).not.toContain(secret);
    }
  });

  it("degrades to COD only when Paymob is not fully configured", () => {
    configure();
    env.PAYMOB_SECRET_KEY = undefined;

    expect(listEnabledPaymentMethods()).toMatchObject({ cod: true, provider: "paymob", methods: [] });
  });
});

describe("assertPaymentMethodEnabled", () => {
  it("accepts an enabled method", () => {
    configure();
    expect(assertPaymentMethodEnabled("card")).toBe("card");
  });

  it("rejects an activated-list mismatch", () => {
    configure();
    expect(() => assertPaymentMethodEnabled("mada")).toThrow(/not enabled for this merchant/);
  });

  it("rejects an unknown code", () => {
    configure();
    expect(() => assertPaymentMethodEnabled("bitcoin")).toThrow(/Unknown payment method/);
  });

  it("returns 503 when Paymob is not configured, before any charge", () => {
    configure();
    env.PAYMOB_REGION = undefined;

    let caught: unknown;
    try {
      assertPaymentMethodEnabled("card");
    } catch (error) {
      caught = error;
    }
    expect(caught).toMatchObject({ status: 503 });
  });
});
