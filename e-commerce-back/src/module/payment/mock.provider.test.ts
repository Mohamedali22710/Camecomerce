import { afterEach, describe, expect, it } from "@jest/globals";

import { HttpError } from "../../common/utils/httpError.js";

import {
  MOCK_SIGNATURE_HEADER,
  mockPaymentProvider,
  resetMockPaymentProvider,
  signMockPayload,
} from "./mock.provider.js";

const sessionInput = {
  orderId: "507f1f77bcf86cd799439011",
  orderNumber: "CCTV-261116-0001",
  amountMinor: 125_000,
  currency: "SAR",
  items: [{ name: "4-camera kit", quantity: 1, unitAmountMinor: 125_000 }],
  notificationUrl: "https://example.test/v1/payment/paymob/webhook",
  redirectionUrl: "https://example.test/checkout/result",
};

const signedEventBody = (overrides: Record<string, unknown> = {}): Buffer =>
  Buffer.from(
    JSON.stringify({
      providerTransactionId: "mock_txn_CCTV-261116-0001",
      providerReference: "mock_CCTV-261116-0001",
      orderNumber: "CCTV-261116-0001",
      status: "paid",
      success: true,
      amountMinor: 125_000,
      currency: "SAR",
      ...overrides,
    }),
  );

afterEach(() => {
  resetMockPaymentProvider();
});

describe("mock payment provider", () => {
  it("returns the same session shape as the provider contract", async () => {
    const session = await mockPaymentProvider.createSession(sessionInput);

    expect(session).toMatchObject({
      provider: "mock",
      providerReference: "mock_CCTV-261116-0001",
      providerTransactionId: "mock_txn_CCTV-261116-0001",
      amountMinor: 125_000,
      currency: "SAR",
      paymentStatus: "pending",
      clientSecret: null,
    });
    expect(session.redirectUrl).toContain("mock_CCTV-261116-0001");
  });

  it("accepts only a correctly signed event body", async () => {
    const body = signedEventBody();
    const event = await mockPaymentProvider.verifyAndParse(body, {
      [MOCK_SIGNATURE_HEADER]: signMockPayload(body),
    });

    expect(event).toMatchObject({
      provider: "mock",
      status: "paid",
      success: true,
      amountMinor: 125_000,
      currency: "SAR",
      hmacVerified: true,
    });
  });

  it("rejects a missing or tampered signature without parsing business data", async () => {
    const body = signedEventBody();

    await expect(mockPaymentProvider.verifyAndParse(body, {})).rejects.toBeInstanceOf(HttpError);
    await expect(
      mockPaymentProvider.verifyAndParse(body, {
        [MOCK_SIGNATURE_HEADER]: signMockPayload("different-body"),
      }),
    ).rejects.toThrow(/Invalid mock payment signature/);
  });

  it("stores verified status so fetchStatus can answer an inquiry", async () => {
    const session = await mockPaymentProvider.createSession(sessionInput);
    const body = signedEventBody();
    await mockPaymentProvider.verifyAndParse(body, {
      [MOCK_SIGNATURE_HEADER]: signMockPayload(body),
    });

    const status = await mockPaymentProvider.fetchStatus(session.providerReference);

    expect(status.status).toBe("paid");
    expect(status.amountMinor).toBe(125_000);
    expect(status.success).toBe(true);
  });
});
