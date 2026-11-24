import { describe, expect, it } from "@jest/globals";

import { updateShippingSettingValidate } from "./setting.validate.js";

describe("updateShippingSettingValidate", () => {
  it("accepts valid positive shippingCost and defaults shippingType", () => {
    const result = updateShippingSettingValidate.safeParse({
      shippingCost: 50,
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.shippingCost).toBe(50);
  });

  it("accepts zero as a valid shippingCost (free shipping)", () => {
    const result = updateShippingSettingValidate.safeParse({
      shippingCost: 0,
      shippingType: "fixed",
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.shippingCost).toBe(0);
    expect(result.data.shippingType).toBe("fixed");
  });

  it("coerces string numbers to number", () => {
    const result = updateShippingSettingValidate.safeParse({
      shippingCost: "75.5",
      shippingType: "percentage",
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.shippingCost).toBe(75.5);
    expect(result.data.shippingType).toBe("percentage");
  });

  it("rejects negative shippingCost", () => {
    const result = updateShippingSettingValidate.safeParse({
      shippingCost: -10,
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-numeric shippingCost", () => {
    const result = updateShippingSettingValidate.safeParse({
      shippingCost: "free",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid shippingType", () => {
    const result = updateShippingSettingValidate.safeParse({
      shippingCost: 20,
      shippingType: "invalid_type",
    });
    expect(result.success).toBe(false);
  });
});

