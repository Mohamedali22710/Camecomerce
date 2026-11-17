import { describe, expect, it } from "@jest/globals";

import { createOrderValidate } from "./order.validate.js";

const shippingAddress = {
  fullName: "Test User",
  phone: "+966500000000",
  street: "King Fahd Road",
  city: "Riyadh",
  country: "SA",
};

const productId = "507f1f77bcf86cd799439011";
const bundleId = "507f1f77bcf86cd799439012";

describe("createOrderValidate", () => {
  it("accepts explicit product items", () => {
    const result = createOrderValidate.safeParse({
      items: [{ productId, quantity: 2 }],
      paymentMethod: "cod",
      shippingAddress,
    });

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }
    expect(result.data.items?.[0]).toMatchObject({ color: "Default", size: "Default" });
  });

  it("accepts a configured bundle line and ignores a client price", () => {
    const result = createOrderValidate.safeParse({
      items: [
        {
          itemType: "bundle",
          bundleId,
          hddOption: "HDD-2TB",
          installationOption: "INSTALL-BASIC",
          quantity: 1,
          price: 1,
        },
      ],
      paymentMethod: "card",
      shippingAddress,
    });

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }
    expect(result.data.items?.[0]).toMatchObject({
      itemType: "bundle",
      bundleId,
      hddOption: "HDD-2TB",
      installationOption: "INSTALL-BASIC",
    });
  });

  it("accepts cart checkout without an items array", () => {
    const result = createOrderValidate.safeParse({
      useCart: true,
      paymentMethod: "cod",
      shippingAddress,
    });

    expect(result.success).toBe(true);
  });

  it("requires either items or useCart", () => {
    const result = createOrderValidate.safeParse({
      paymentMethod: "cod",
      shippingAddress,
    });

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }
    expect(result.error.issues[0]?.message).toMatch(/useCart/);
  });

  it("rejects a bundle item without option codes", () => {
    const result = createOrderValidate.safeParse({
      items: [{ itemType: "bundle", bundleId, quantity: 1 }],
      paymentMethod: "cod",
      shippingAddress,
    });

    expect(result.success).toBe(false);
  });

  it("rejects an empty items array", () => {
    const result = createOrderValidate.safeParse({
      items: [],
      paymentMethod: "cod",
      shippingAddress,
    });

    expect(result.success).toBe(false);
  });
});
