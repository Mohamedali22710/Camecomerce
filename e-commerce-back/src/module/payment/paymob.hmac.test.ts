import { describe, expect, it } from "@jest/globals";

import {
  buildPaymobHmacString,
  computePaymobHmac,
  mapPaymobTransactionStatus,
  verifyPaymobHmac,
} from "./paymob.hmac.js";

const SECRET = "test-hmac-secret";

const transaction = {
  amount_cents: 125000,
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
  order: { id: 445566 },
  owner: 123,
  pending: false,
  source_data: { pan: "2346", sub_type: "MasterCard", type: "card" },
  success: true,
};

describe("Paymob transaction HMAC", () => {
  it("concatenates the documented twenty fields in order", () => {
    expect(buildPaymobHmacString(transaction)).toBe(
      "1250002026-11-19T10:00:00.000000SARfalsefalse9988776067846truefalsefalsefalsetruefalse" +
        "445566123false2346MasterCardcardtrue",
    );
  });

  it("matches a known HMAC-SHA512 vector", () => {
    expect(computePaymobHmac(transaction, SECRET)).toBe(
      "3abe54c0204e42a0787fdc93d368d762c3f116cc6ce210beb0270f05abb8935a" +
        "0bf6fb7ce8d7eb2968bf25dcd6f33ec2c2dfb0232f3fd882b2fbbed6f119977f",
    );
  });

  it("accepts the matching signature and rejects tampering", () => {
    const signature = computePaymobHmac(transaction, SECRET);

    expect(verifyPaymobHmac(transaction, signature, SECRET)).toBe(true);
    expect(verifyPaymobHmac({ ...transaction, amount_cents: 1 }, signature, SECRET)).toBe(false);
    expect(verifyPaymobHmac(transaction, `${signature}0`, SECRET)).toBe(false);
  });

  it("rejects a missing signature without throwing", () => {
    expect(verifyPaymobHmac(transaction, undefined, SECRET)).toBe(false);
    expect(verifyPaymobHmac(transaction, "", SECRET)).toBe(false);
  });

  it("treats null and undefined fields as empty strings", () => {
    expect(buildPaymobHmacString({ success: true })).toBe("true");
  });
});

describe("mapPaymobTransactionStatus", () => {
  it("maps successful, pending, failed, and voided transactions", () => {
    expect(mapPaymobTransactionStatus({ success: true, pending: false })).toMatchObject({ status: "paid" });
    expect(mapPaymobTransactionStatus({ success: false, pending: true })).toMatchObject({ status: "pending" });
    expect(mapPaymobTransactionStatus({ success: false, pending: false })).toMatchObject({ status: "failed" });
    expect(mapPaymobTransactionStatus({ success: true, pending: false, is_voided: true })).toMatchObject({
      status: "cancelled",
    });
  });
});
