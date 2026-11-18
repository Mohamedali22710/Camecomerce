import { describe, expect, it } from "@jest/globals";

import { addCartValidate } from "./cart.validate.js";

describe("addCartValidate", () => {
  it("defaults missing variant labels and coerces quantity", () => {
    const result = addCartValidate.safeParse({
      productId: "507f1f77bcf86cd799439011",
      quantity: "2",
    });

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }
    expect(result.data.color).toBe("Default");
    expect(result.data.size).toBe("Default");
    expect(result.data.quantity).toBe(2);
  });

  it("rejects a non-ObjectId product id", () => {
    const result = addCartValidate.safeParse({
      productId: "not-an-id",
      quantity: 1,
    });

    expect(result.success).toBe(false);
  });

  it("rejects a quantity outside the allowed range", () => {
    const productId = "507f1f77bcf86cd799439011";

    expect(addCartValidate.safeParse({ productId, quantity: 0 }).success).toBe(false);
    expect(addCartValidate.safeParse({ productId, quantity: 1001 }).success).toBe(false);
  });

  it("parses a configured bundle line without accepting a price", () => {
    const result = addCartValidate.safeParse({
      itemType: "bundle",
      bundleId: "507f1f77bcf86cd799439011",
      hddOption: "HDD-2TB",
      installationOption: "INSTALL-BASIC",
      quantity: "2",
      price: 1,
    });

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }
    expect(result.data).toMatchObject({
      itemType: "bundle",
      hddOption: "HDD-2TB",
      installationOption: "INSTALL-BASIC",
      quantity: 2,
    });
    expect(result.data).not.toHaveProperty("productId");
  });

  it("rejects a bundle line without option codes", () => {
    const result = addCartValidate.safeParse({
      itemType: "bundle",
      bundleId: "507f1f77bcf86cd799439011",
      quantity: 1,
    });

    expect(result.success).toBe(false);
  });
});
