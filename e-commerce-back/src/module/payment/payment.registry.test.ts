import { afterEach, describe, expect, it } from "@jest/globals";

import { env } from "../../../config/env.service.js";

import { resetMockPaymentProvider } from "./mock.provider.js";
import { assertPaymentProviderConfig, getPaymentProvider } from "./payment.registry.js";

const originalProvider = env.paymentProvider;
const originalProduction = env.isProduction;

afterEach(() => {
  env.paymentProvider = originalProvider;
  env.isProduction = originalProduction;
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

  it("reports Paymob as not implemented instead of returning a fake adapter", () => {
    env.paymentProvider = "paymob";
    env.isProduction = false;

    expect(() => assertPaymentProviderConfig()).not.toThrow();
    expect(() => getPaymentProvider()).toThrow(/not implemented yet/);
  });
});
