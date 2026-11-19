import { afterEach, describe, expect, it } from "@jest/globals";

import { env } from "../../../config/env.service.js";

import type { CreateSessionInput, FetchStatusResult } from "./payment.types.js";
import { getPaymobConfig } from "./paymob.config.js";
import { computePaymobHmac } from "./paymob.hmac.js";
import {
  buildPaymobCheckoutUrl,
  buildPaymobIntentionPayload,
  createPaymobIntention,
  normalizeCountryCode,
  paymobPaymentProvider,
  resetPaymobAuthTokenCache,
} from "./paymob.provider.js";

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

const configure = (): void => {
  env.PAYMOB_REGION = "eg";
  env.PAYMOB_ENV = "sandbox";
  env.PAYMOB_API_KEY = "api-key";
  env.PAYMOB_SECRET_KEY = "secret-key";
  env.PAYMOB_PUBLIC_KEY = "public-key";
  env.PAYMOB_HMAC_SECRET = "hmac-secret";
  env.PAYMOB_BASE_URL = undefined;
  env.PAYMOB_CHECKOUT_URL = undefined;
  env.PAYMOB_INTEGRATION_ID_CARD = "6067846";
  env.PAYMOB_METHODS_ENABLED = "card";
};

const input: CreateSessionInput = {
  orderId: "507f1f77bcf86cd799439011",
  orderNumber: "CCTV-261119-AB12",
  amountMinor: 125_000,
  shippingMinor: 2_000,
  currency: "SAR",
  method: "card",
  items: [{ name: "4-camera kit", quantity: 1, unitAmountMinor: 123_000 }],
  customer: {
    fullName: "Test User",
    phone: "+966500000000",
    email: "buyer@example.test",
    street: "King Fahd Road",
    city: "Riyadh",
    country: "SA",
  },
  notificationUrl: "https://api.example.test/v1/payment/paymob/webhook",
  redirectionUrl: "https://shop.example.test/checkout/success",
};

afterEach(() => {
  for (const key of KEYS) {
    env[key] = original[key];
  }
  env.PAYMOB_ENV = "sandbox";
  resetPaymobAuthTokenCache();
});

describe("Paymob intention payload", () => {
  it("uses the stored amount, an explicit shipping line, and no client data", () => {
    configure();
    const payload = buildPaymobIntentionPayload(input, getPaymobConfig(), 6067846);

    expect(payload).toMatchObject({
      amount: 125_000,
      currency: "SAR",
      payment_methods: [6067846],
      special_reference: "CCTV-261119-AB12",
      notification_url: input.notificationUrl,
      redirection_url: input.redirectionUrl,
      extras: { order_id: input.orderId, order_number: input.orderNumber },
      customer: { first_name: "Test", last_name: "User", email: "buyer@example.test" },
    });
    expect(payload.items).toEqual([
      { name: "4-camera kit", amount: 123_000, quantity: 1 },
      { name: "Shipping", amount: 2_000, quantity: 1 },
    ]);
    expect(payload.billing_data.country).toBe("SAU");
  });

  it("normalizes country names and falls back to the selected region", () => {
    expect(normalizeCountryCode("Saudi Arabia", "eg")).toBe("SAU");
    expect(normalizeCountryCode("Egypt", "ksa")).toBe("EGY");
    expect(normalizeCountryCode(undefined, "ksa")).toBe("SAU");
  });

  it("builds the Unified Checkout URL without leaking the secret key", () => {
    configure();
    const url = buildPaymobCheckoutUrl(getPaymobConfig(), "client-secret");

    expect(url).toBe("https://accept.paymob.com/unifiedcheckout/?publicKey=public-key&clientSecret=client-secret");
    expect(url).not.toContain("secret-key");
  });
});

describe("Paymob Intention API call", () => {
  it("posts to /v1/intention/ with the secret-key token header", async () => {
    configure();
    const config = getPaymobConfig();
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fetchStub = async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
      calls.push({ url: String(url), init });
      return new Response(
        JSON.stringify({ id: "int_1", intention_order_id: "ord_1", client_secret: "cs_1" }),
        { status: 200 },
      );
    };

    const result = await createPaymobIntention(
      buildPaymobIntentionPayload(input, config, 6067846),
      config,
      fetchStub as typeof fetch,
    );

    expect(result).toEqual({ intentionId: "int_1", providerReference: "ord_1", clientSecret: "cs_1" });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://accept.paymob.com/v1/intention/");
    expect(calls[0]?.init?.method).toBe("POST");
    expect((calls[0]?.init?.headers as Record<string, string>).Authorization).toBe("Token secret-key");
    // The request body carries integers, never formatted decimals.
    expect(JSON.parse(String(calls[0]?.init?.body)).amount).toBe(125_000);
  });
});

describe("Paymob webhook verification", () => {
  const bodyFor = () => {
    const obj = {
      amount_cents: 125_000,
      created_at: "2026-11-19T10:00:00.000000",
      currency: "SAR",
      error_occured: false,
      has_parent_transaction: false,
      id: 998877,
      integration_id: 6067846,
      is_3d_secure: true,
      is_auth: false,
      is_capture: false,
      is_refunded: false,
      is_standalone_payment: true,
      is_voided: false,
      order: { id: 445566, merchant_order_id: "CCTV-261119-AB12" },
      owner: 123,
      pending: false,
      source_data: { pan: "2346", sub_type: "MasterCard", type: "card" },
      success: true,
    };
    return Buffer.from(JSON.stringify({ type: "TRANSACTION", obj }));
  };

  it("parses a valid, HMAC-signed callback", async () => {
    configure();
    const body = bodyFor();
    const hmac = computePaymobHmac(JSON.parse(body.toString("utf8")).obj, "hmac-secret");

    const event = await paymobPaymentProvider.verifyAndParse(body, {}, { hmac });

    expect(event).toMatchObject({
      provider: "paymob",
      providerTransactionId: "998877",
      providerReference: "445566",
      orderNumber: "CCTV-261119-AB12",
      status: "paid",
      success: true,
      amountMinor: 125_000,
      currency: "SAR",
      verified: true,
      source: "webhook",
    });
    expect(Buffer.isBuffer(body)).toBe(true);
  });

  it("returns 401 for a missing or invalid signature before trusting fields", async () => {
    configure();
    const body = bodyFor();

    await expect(paymobPaymentProvider.verifyAndParse(body, {}, {})).rejects.toMatchObject({ status: 401 });
    await expect(paymobPaymentProvider.verifyAndParse(body, {}, { hmac: "deadbeef" })).rejects.toMatchObject({
      status: 401,
    });
  });

  it("rejects an empty raw body", async () => {
    configure();
    await expect(paymobPaymentProvider.verifyAndParse(Buffer.from(""), {}, {})).rejects.toMatchObject({
      status: 401,
    });
  });
});

describe("Paymob inquiry", () => {
  it("exchanges the API key for a token and maps the latest transaction", async () => {
    configure();
    const calls: string[] = [];
    const fetchStub = async (url: string | URL | Request): Promise<Response> => {
      calls.push(String(url));
      if (String(url).endsWith("/api/auth/tokens")) {
        return new Response(JSON.stringify({ token: "inq-token" }), { status: 200 });
      }
      return new Response(
        JSON.stringify({
          id: 445566,
          amount_cents: 125_000,
          currency: "SAR",
          transactions: [
            { id: 1, created_at: "2026-11-19T09:00:00", success: false, pending: false, amount_cents: 1 },
            { id: 2, created_at: "2026-11-19T10:00:00", success: true, pending: false, amount_cents: 125_000, currency: "SAR" },
          ],
        }),
        { status: 200 },
      );
    };

    const fetchStatus = paymobPaymentProvider.fetchStatus as (
      reference: string,
      impl: typeof fetch,
    ) => Promise<FetchStatusResult>;
    const result = await fetchStatus("445566", fetchStub as typeof fetch);

    expect(calls[0]).toBe("https://accept.paymob.com/api/auth/tokens");
    expect(calls[1]).toBe("https://accept.paymob.com/api/ecommerce/orders/445566?token=inq-token");
    expect(result).toMatchObject({
      providerTransactionId: "2",
      status: "paid",
      amountMinor: 125_000,
      currency: "SAR",
      success: true,
    });
  });
});
