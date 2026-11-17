import { describe, expect, it } from "@jest/globals";

import { paymentOrderParamsValidate } from "./payment.validate.js";

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
