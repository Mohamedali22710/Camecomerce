/** Deterministic mock payment adapter (MVP-02).
 *
 * Purpose: prove the provider-agnostic contract and exercise checkout, webhook,
 * and status flows without real merchant credentials. It is NOT an integration:
 * it never talks to a payment provider and must never be enabled in production.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

import { env } from "../../../config/env.service.js";
import { HttpError } from "../../common/utils/httpError.js";

import {
  CreateSessionInput,
  CreateSessionResult,
  FetchStatusResult,
  PAYMENT_STATUSES,
  PaymentProvider,
  PaymentStatus,
  VerifiedPaymentEvent,
} from "./payment.types.js";

export const MOCK_SIGNATURE_HEADER = "x-mock-signature";

/** Development-only signing key. There is no production secret to leak. */
const MOCK_SIGNING_SECRET = "cctv-mock-payment-dev-only";

interface MockSessionState {
  result: CreateSessionResult;
}

const sessions = new Map<string, MockSessionState>();
const transactionToReference = new Map<string, string>();

const assertAmountMinor = (amountMinor: number): void => {
  if (!Number.isInteger(amountMinor) || amountMinor < 0) {
    throw new HttpError(400, "amountMinor must be a non-negative integer");
  }
};

const isPaymentStatus = (value: unknown): value is PaymentStatus =>
  typeof value === "string" && (PAYMENT_STATUSES as readonly string[]).includes(value);

/** Signs a mock webhook body. Exported for tests and local development only. */
export const signMockPayload = (rawBody: Buffer | string): string =>
  createHmac("sha512", MOCK_SIGNING_SECRET).update(rawBody).digest("hex");

const hasValidSignature = (rawBody: Buffer, signature: string): boolean => {
  const expected = Buffer.from(signMockPayload(rawBody), "utf8");
  const provided = Buffer.from(signature, "utf8");
  return expected.length === provided.length && timingSafeEqual(expected, provided);
};

const readSignature = (headers: Record<string, string | string[] | undefined>): string | undefined => {
  const raw = headers[MOCK_SIGNATURE_HEADER];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
};

const parseSignedBody = (
  rawBody: Buffer,
  headers: Record<string, string | string[] | undefined>,
): Record<string, unknown> => {
  const signature = readSignature(headers);
  if (!signature) {
    throw new HttpError(401, "Missing mock payment signature");
  }
  if (!hasValidSignature(rawBody, signature)) {
    throw new HttpError(401, "Invalid mock payment signature");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody.toString("utf8"));
  } catch {
    throw new HttpError(400, "Invalid mock payment payload");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new HttpError(400, "Invalid mock payment payload");
  }
  return parsed as Record<string, unknown>;
};

const readString = (payload: Record<string, unknown>, field: string): string => {
  const value = payload[field];
  if (typeof value !== "string" || !value.trim()) {
    throw new HttpError(400, `Mock payload requires ${field}`);
  }
  return value;
};

const readAmountMinor = (payload: Record<string, unknown>): number => {
  const value = payload.amountMinor;
  if (typeof value !== "number") {
    throw new HttpError(400, "Mock payload requires a numeric amountMinor");
  }
  assertAmountMinor(value);
  return value;
};

const readStatus = (payload: Record<string, unknown>): PaymentStatus => {
  const status = payload.status;
  if (!isPaymentStatus(status)) {
    throw new HttpError(400, "Mock payload has an unsupported payment status");
  }
  return status;
};

const readEventFields = (payload: Record<string, unknown>) => {
  const orderNumber = readString(payload, "orderNumber");
  const status = readStatus(payload);
  const reference = payload.providerReference;

  return {
    providerTransactionId: readString(payload, "providerTransactionId"),
    orderNumber,
    status,
    amountMinor: readAmountMinor(payload),
    currency: readString(payload, "currency").toUpperCase(),
    providerReference: typeof reference === "string" && reference.trim() ? reference : `mock_${orderNumber}`,
    success: typeof payload.success === "boolean" ? payload.success : status === "paid",
  };
};

/** Clears in-memory mock state. Intended for tests only. */
export const resetMockPaymentProvider = (): void => {
  sessions.clear();
  transactionToReference.clear();
};

export const mockPaymentProvider: PaymentProvider = {
  name: "mock",

  async createSession(input: CreateSessionInput): Promise<CreateSessionResult> {
    assertAmountMinor(input.amountMinor);
    if (!input.orderNumber.trim()) {
      throw new HttpError(400, "orderNumber is required");
    }

    // Deterministic reference so repeated calls for the same order are traceable.
    const providerReference = `mock_${input.orderNumber}`;
    const providerTransactionId = `mock_txn_${input.orderNumber}`;

    const result: CreateSessionResult = {
      provider: "mock",
      providerReference,
      providerTransactionId,
      amountMinor: input.amountMinor,
      currency: input.currency.toUpperCase(),
      paymentStatus: "pending",
      redirectUrl: `${env.frontendUrl}/checkout/mock?reference=${encodeURIComponent(providerReference)}`,
      clientSecret: null,
    };

    sessions.set(providerReference, { result });
    transactionToReference.set(providerTransactionId, providerReference);
    return { ...result };
  },

  async verifyAndParse(
    rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>,
  ): Promise<VerifiedPaymentEvent> {
    const payload = parseSignedBody(rawBody, headers);
    const fields = readEventFields(payload);

    const state = sessions.get(fields.providerReference);
    if (state) {
      state.result.paymentStatus = fields.status;
      state.result.providerTransactionId = fields.providerTransactionId;
      transactionToReference.set(fields.providerTransactionId, fields.providerReference);
    }

    return {
      provider: "mock",
      ...fields,
      hmacVerified: true,
      payload,
    };
  },

  async fetchStatus(providerReference: string): Promise<FetchStatusResult> {
    const reference = sessions.has(providerReference)
      ? providerReference
      : transactionToReference.get(providerReference);

    const state = reference ? sessions.get(reference) : undefined;
    if (!state) {
      throw new HttpError(404, "Mock payment session not found");
    }

    return {
      provider: "mock",
      providerReference: state.result.providerReference,
      providerTransactionId: state.result.providerTransactionId,
      status: state.result.paymentStatus,
      amountMinor: state.result.amountMinor,
      currency: state.result.currency,
      success: state.result.paymentStatus === "paid",
    };
  },
};
