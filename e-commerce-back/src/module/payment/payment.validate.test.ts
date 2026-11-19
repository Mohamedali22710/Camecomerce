import { describe, expect, it } from "@jest/globals";

import { paymentOrderParamsValidate, paymentSessionValidate } from "./payment.validate.js";

describe("paymentOrderParamsValidate", () => {
  it("accepts generated order numbers", () => {
    expect(paymentOrderParamsValidate.safeParse({ orderNumber: "CCTV-261117-AB12" }).success).toBe(true);
  });

  it("accepts legacy display order numbers", () => {
    expect(paymentOrderParamsValidate.safeParse({ orderNumber: "CCTV-LEGACY-507F1F77" }).success).toBe(true);
  });

  it("rejects provider-controlled or malformed values", () => {
    for (const orderNumber of ["", "12345", "cctv-261117-ab12", "CCTV-<script>"]) {
      expect(paymentOrderParamsValidate.safeParse({ orderNumber }).success).toBe(false);
    }
  });
});

describe("paymentSessionValidate", () => {
  it("accepts an order number with an optional known method", () => {
    expect(paymentSessionValidate.safeParse({ orderNumber: "CCTV-261117-AB12" }).success).toBe(true);
    expect(paymentSessionValidate.safeParse({ orderNumber: "CCTV-261117-AB12", method: "mada" }).success).toBe(
      true,
    );
  });

  it("requires an order number so an amount can never be the only input", () => {
    expect(paymentSessionValidate.safeParse({ amountMinor: 1 }).success).toBe(false);
  });

  it("rejects an unknown method", () => {
    expect(paymentSessionValidate.safeParse({ orderNumber: "CCTV-261117-AB12", method: "bitcoin" }).success).toBe(
      false,
    );
  });
});
