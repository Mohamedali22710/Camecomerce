/** Paymob adapter: Intention API checkout, transaction HMAC, and inquiry.
 *
 * Flow (verified against Paymob's current developer docs):
 *   1. `POST {base}/v1/intention/` with `Authorization: Token <secret key>`
 *      returns `id`, `intention_order_id`, and `client_secret`.
 *   2. The customer is redirected to
 *      `{checkout}/unifiedcheckout/?publicKey=...&clientSecret=...`.
 *   3. Paymob POSTs the transaction to our notification URL with `?hmac=`.
 *      The signature is verified over the documented 20 fields before any
 *      business decision is taken.
 *   4. `fetchStatus` uses the legacy Inquiry API (API key -> short-lived auth
 *      token) as the secondary, pull-based confirmation path.
 *
 * The secret key, API key, and HMAC secret never leave the server. The
 * intention's `client_secret` is used only to build the checkout URL and is not
 * echoed to API clients.
 */
import { HttpError } from "../../common/utils/httpError.js";

import {
  CreateSessionInput,
  CreateSessionResult,
  FetchStatusResult,
  PaymentMethodCode,
  PaymentProvider,
  VerifiedPaymentEvent,
} from "./payment.types.js";
import { getPaymobConfig, PaymobConfig, PaymobConfigError, PaymobRegion } from "./paymob.config.js";
import { mapPaymobTransactionStatus, verifyPaymobHmac } from "./paymob.hmac.js";

export type FetchLike = typeof fetch;

const REQUEST_TIMEOUT_MS = 15_000;
const AUTH_TOKEN_TTL_MS = 5 * 60 * 1000;

const unavailable = (): never => {
  throw new HttpError(503, "Paymob is not configured. No payment was taken.");
};

/**
 * Turns a configuration error into the same safe 503 used by the adapter. The
 * message lists missing variable names only; no value is echoed.
 */
const assertPaymobConfigured = (): PaymobConfig => {
  try {
    return getPaymobConfig();
  } catch (error) {
    if (error instanceof PaymobConfigError) {
      throw new HttpError(503, `${error.message} No payment was taken.`);
    }
    throw error;
  }
};

interface RequestOptions {
  method: "GET" | "POST";
  headers?: Record<string, string>;
  body?: string;
}

/**
 * Performs a provider request and returns parsed JSON. Only the HTTP status is
 * surfaced on failure: a provider error body can contain merchant-specific
 * detail and must not reach a client response or a log line.
 */
const requestJson = async (
  url: string,
  options: RequestOptions,
  fetchImpl: FetchLike,
): Promise<unknown> => {
  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: options.method,
      headers: options.headers,
      body: options.body,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    const name = (error as Error)?.name;
    const reason = name === "TimeoutError" ? "timed out" : "could not be reached";
    throw new HttpError(502, `Paymob ${reason}. No payment was taken.`);
  }

  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    // Deliberately excludes the response body.
    throw new HttpError(502, `Paymob request failed with HTTP ${response.status}. No payment was taken.`);
  }

  return data;
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

const nonEmptyString = (value: unknown): string | null => {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return null;
};

const splitName = (fullName: string | undefined): { first: string; last: string } => {
  const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  return {
    first: parts[0] ?? "Customer",
    last: parts.slice(1).join(" ") || "Customer",
  };
};

const COUNTRY_ISO3: Record<string, string> = {
  eg: "EGY",
  egy: "EGY",
  egypt: "EGY",
  sa: "SAU",
  sau: "SAU",
  ksa: "SAU",
  "saudi arabia": "SAU",
  saudi: "SAU",
};

/** Paymob's billing_data wants a 3-letter ISO country code. */
export const normalizeCountryCode = (country: string | undefined, region: PaymobRegion): string => {
  const value = (country ?? "").trim().toLowerCase();
  if (COUNTRY_ISO3[value]) {
    return COUNTRY_ISO3[value];
  }
  if (/^[a-z]{3}$/.test(value)) {
    return value.toUpperCase();
  }
  return region === "eg" ? "EGY" : "SAU";
};

export interface PaymobIntentionItem {
  name: string;
  amount: number;
  quantity: number;
  description?: string;
}

export interface PaymobBillingData {
  first_name: string;
  last_name: string;
  phone_number: string;
  email: string;
  street: string;
  building: string;
  floor: string;
  apartment: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
}

export interface PaymobIntentionPayload {
  amount: number;
  currency: string;
  payment_methods: number[];
  items: PaymobIntentionItem[];
  billing_data: PaymobBillingData;
  customer: {
    first_name: string;
    last_name: string;
    email: string;
  };
  special_reference: string;
  notification_url: string;
  redirection_url: string;
  extras: Record<string, string>;
}

/** Resolves the integration id for the selected method, refusing disabled ones. */
export const resolveIntegrationId = (config: PaymobConfig, method: PaymentMethodCode = "card"): number => {
  const enabled = config.enabledMethods.includes(method);
  const integrationId = config.methods[method];
  if (!enabled || !integrationId) {
    throw new HttpError(
      400,
      `Payment method "${method}" is not enabled for this merchant. ` +
        `Enabled methods: ${config.enabledMethods.join(", ")}.`,
    );
  }
  return integrationId;
};

/** Pure payload builder; unit-tested without network access. */
export const buildPaymobIntentionPayload = (
  input: CreateSessionInput,
  config: PaymobConfig,
  integrationId: number,
): PaymobIntentionPayload => {
  const name = splitName(input.customer?.fullName);

  const items: PaymobIntentionItem[] = input.items
    .filter((item) => item.quantity > 0 && item.unitAmountMinor >= 0)
    .map((item) => ({
      name: item.name,
      amount: item.unitAmountMinor,
      quantity: item.quantity,
    }));

  if (input.shippingMinor && input.shippingMinor > 0) {
    items.push({ name: "Shipping", amount: input.shippingMinor, quantity: 1 });
  }

  return {
    amount: input.amountMinor,
    currency: input.currency.toUpperCase(),
    payment_methods: [integrationId],
    items,
    billing_data: {
      first_name: name.first,
      last_name: name.last,
      phone_number: input.customer?.phone || "NA",
      email: input.customer?.email || "NA",
      street: input.customer?.street || "NA",
      building: "NA",
      floor: "NA",
      apartment: "NA",
      city: input.customer?.city || "NA",
      state: input.customer?.state || "NA",
      country: normalizeCountryCode(input.customer?.country, config.region),
      postal_code: input.customer?.zipCode || "NA",
    },
    customer: {
      first_name: name.first,
      last_name: name.last,
      email: input.customer?.email || "NA",
    },
    special_reference: input.orderNumber,
    notification_url: input.notificationUrl,
    redirection_url: input.redirectionUrl,
    extras: {
      order_id: input.orderId,
      order_number: input.orderNumber,
    },
  };
};

/** Builds the documented Unified Checkout URL from the intention client secret. */
export const buildPaymobCheckoutUrl = (config: PaymobConfig, clientSecret: string): string =>
  `${config.checkoutUrl}/?publicKey=${encodeURIComponent(config.publicKey)}` +
  `&clientSecret=${encodeURIComponent(clientSecret)}`;

interface IntentionResponse {
  intentionId: string;
  providerReference: string;
  clientSecret: string;
}

/** Creates the intention. Exported so a test can inject a fetch stub. */
export const createPaymobIntention = async (
  payload: PaymobIntentionPayload,
  config: PaymobConfig,
  fetchImpl: FetchLike = fetch,
): Promise<IntentionResponse> => {
  const data = await requestJson(
    `${config.baseUrl}/v1/intention/`,
    {
      method: "POST",
      headers: {
        Authorization: `Token ${config.secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
    fetchImpl,
  );

  const record = asRecord(data);
  const intentionId = nonEmptyString(record?.id);
  const providerReference = nonEmptyString(record?.intention_order_id);
  const clientSecret = nonEmptyString(record?.client_secret);

  if (!intentionId || !providerReference || !clientSecret) {
    throw new HttpError(502, "Paymob returned an invalid checkout response. No payment was taken.");
  }

  return { intentionId, providerReference, clientSecret };
};

let authTokenCache: { key: string; token: string; expiresAt: number } | null = null;

/** @internal Test-only reset so one test's token cannot leak into the next. */
export const resetPaymobAuthTokenCache = (): void => {
  authTokenCache = null;
};

/** Exchanges the API key for a short-lived inquiry token. Never logged. */
const getInquiryToken = async (config: PaymobConfig, fetchImpl: FetchLike): Promise<string> => {
  const cacheKey = `${config.region}:${config.environment}:${config.baseUrl}`;
  if (authTokenCache && authTokenCache.key === cacheKey && authTokenCache.expiresAt > Date.now()) {
    return authTokenCache.token;
  }

  const data = await requestJson(
    `${config.baseUrl}/api/auth/tokens`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: config.apiKey }),
    },
    fetchImpl,
  );

  const token = nonEmptyString(asRecord(data)?.token);
  if (!token) {
    throw new HttpError(502, "Paymob inquiry authentication failed. Local state was not changed.");
  }

  authTokenCache = { key: cacheKey, token, expiresAt: Date.now() + AUTH_TOKEN_TTL_MS };
  return token;
};

const pickLatestTransaction = (transactions: unknown): Record<string, unknown> | null => {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return null;
  }

  const rows = transactions
    .map(asRecord)
    .filter((row): row is Record<string, unknown> => Boolean(row));

  if (rows.length === 0) {
    return null;
  }

  return rows.sort((a, b) => {
    const aTime = Date.parse(String(a.created_at ?? "")) || 0;
    const bTime = Date.parse(String(b.created_at ?? "")) || 0;
    if (aTime !== bTime) {
      return bTime - aTime;
    }
    return Number(b.id ?? 0) - Number(a.id ?? 0);
  })[0];
};

export const paymobPaymentProvider: PaymentProvider = {
  name: "paymob",

  async createSession(input: CreateSessionInput, fetchImpl: FetchLike = fetch): Promise<CreateSessionResult> {
    const config = assertPaymobConfigured();
    const integrationId = input.integrationIds?.[0] ?? resolveIntegrationId(config, input.method ?? "card");
    const payload = buildPaymobIntentionPayload(input, config, integrationId);

    const intention = await createPaymobIntention(payload, config, fetchImpl);

    return {
      provider: "paymob",
      providerReference: intention.providerReference,
      providerSessionId: intention.intentionId,
      providerTransactionId: null,
      amountMinor: input.amountMinor,
      currency: input.currency.toUpperCase(),
      paymentStatus: "pending",
      redirectUrl: buildPaymobCheckoutUrl(config, intention.clientSecret),
      // The browser receives only the ready checkout URL.
      clientSecret: null,
    };
  },

  async verifyAndParse(
    rawBody: Buffer,
    _headers: Record<string, string | string[] | undefined>,
    query: Record<string, unknown> = {},
  ): Promise<VerifiedPaymentEvent> {
    const config = assertPaymobConfigured();

    if (!Buffer.isBuffer(rawBody) || rawBody.length === 0) {
      throw new HttpError(401, "Missing Paymob callback body");
    }

    let body: Record<string, unknown>;
    try {
      const parsed = JSON.parse(rawBody.toString("utf8")) as unknown;
      const record = asRecord(parsed);
      if (!record) {
        throw new Error("not an object");
      }
      body = record;
    } catch {
      throw new HttpError(400, "Invalid Paymob callback payload");
    }

    // Signature verification happens before any field is trusted.
    const receivedHmac = Array.isArray(query.hmac) ? query.hmac[0] : query.hmac;
    if (!verifyPaymobHmac(
      (asRecord(body.obj) ?? {}) as Record<string, unknown>,
      typeof receivedHmac === "string" ? receivedHmac : undefined,
      config.hmacSecret,
    )) {
      throw new HttpError(401, "Invalid Paymob callback signature");
    }

    const obj = asRecord(body.obj);
    if (!obj) {
      throw new HttpError(400, "Paymob callback is missing its transaction object");
    }

    const order = asRecord(obj.order);
    const orderNumber = nonEmptyString(order?.merchant_order_id);
    const providerTransactionId = nonEmptyString(obj.id);
    const providerReference = nonEmptyString(order?.id) ?? nonEmptyString(obj.intention_id);

    if (!orderNumber) {
      throw new HttpError(400, "Paymob callback is missing merchant_order_id");
    }
    if (!providerTransactionId || !providerReference) {
      throw new HttpError(400, "Paymob callback is missing transaction/order identifiers");
    }

    const amountMinor = Number(obj.amount_cents);
    if (!Number.isInteger(amountMinor) || amountMinor < 0) {
      throw new HttpError(400, "Paymob callback has an invalid amount");
    }

    const currency = nonEmptyString(obj.currency);
    if (!currency) {
      throw new HttpError(400, "Paymob callback is missing its currency");
    }

    const mapped = mapPaymobTransactionStatus(obj);

    return {
      provider: "paymob",
      providerTransactionId,
      providerReference,
      providerSessionId: nonEmptyString(obj.intention_id),
      orderNumber,
      status: mapped.status,
      success: mapped.success,
      amountMinor,
      currency: currency.toUpperCase(),
      verified: true,
      source: "webhook",
      payload: obj,
    };
  },

  async fetchStatus(providerReference: string, fetchImpl: FetchLike = fetch): Promise<FetchStatusResult> {
    const config = assertPaymobConfigured();
    const reference = (providerReference ?? "").trim();
    if (!reference) {
      throw new HttpError(400, "A provider reference is required for an inquiry");
    }

    const token = await getInquiryToken(config, fetchImpl);
    const data = await requestJson(
      `${config.baseUrl}/api/ecommerce/orders/${encodeURIComponent(reference)}?token=${encodeURIComponent(token)}`,
      { method: "GET" },
      fetchImpl,
    );

    const order = asRecord(data);
    if (!order) {
      throw new HttpError(502, "Paymob returned an invalid inquiry response. Local state was not changed.");
    }

    const transaction = pickLatestTransaction(order.transactions);
    const mapped = transaction ? mapPaymobTransactionStatus(transaction) : null;

    const amountMinorRaw = transaction?.amount_cents ?? order.amount_cents;
    const amountMinor = Number(amountMinorRaw);
    const currency = nonEmptyString(transaction?.currency) ?? nonEmptyString(order.currency);

    return {
      provider: "paymob",
      providerReference: reference,
      providerTransactionId: transaction ? nonEmptyString(transaction.id) : null,
      status: mapped?.status ?? "pending",
      amountMinor: Number.isInteger(amountMinor) && amountMinor >= 0 ? amountMinor : null,
      currency: currency ? currency.toUpperCase() : null,
      success: mapped?.success ?? false,
    };
  },
};

/** @internal Kept for tests that assert a missing-configuration failure. */
export const _unavailable = unavailable;
