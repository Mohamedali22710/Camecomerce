import { describe, expect, it } from "@jest/globals";

import {
  createOrderValidate,
  orderListQueryValidate,
  orderNumberParamsValidate,
  reconcilePaymentValidate,
} from "./order.validate.js";

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

  it("accepts a known online method and rejects an unknown one", () => {
    expect(
      createOrderValidate.safeParse({
        items: [{ productId, quantity: 1 }],
        paymentMethod: "card",
        paymentMethodCode: "mada",
        shippingAddress,
      }).success,
    ).toBe(true);

    expect(
      createOrderValidate.safeParse({
        items: [{ productId, quantity: 1 }],
        paymentMethod: "card",
        paymentMethodCode: "bitcoin",
        shippingAddress,
      }).success,
    ).toBe(false);
  });
});

describe("orderListQueryValidate", () => {
  it("accepts status filters, pagination, and a restricted sort", () => {
    const result = orderListQueryValidate.safeParse({
      paymentStatus: "paid",
      orderStatus: "processing",
      shippingStatus: "shipped",
      sort: "-totalAmount",
      page: "2",
      limit: "25",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toMatchObject({ page: 2, limit: 25, sort: "-totalAmount" });
    }
  });

  it("rejects an unknown status, sort, or oversized limit", () => {
    expect(orderListQueryValidate.safeParse({ paymentStatus: "refunded" }).success).toBe(false);
    expect(orderListQueryValidate.safeParse({ sort: "password" }).success).toBe(false);
    expect(orderListQueryValidate.safeParse({ limit: "500" }).success).toBe(false);
  });

  it("keeps default behaviour when no filters are supplied", () => {
    const result = orderListQueryValidate.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({});
    }
  });
});

describe("orderNumberParamsValidate", () => {
  it("accepts generated and legacy order numbers", () => {
    expect(orderNumberParamsValidate.safeParse({ orderNumber: "CCTV-261119-AB12" }).success).toBe(true);
    expect(orderNumberParamsValidate.safeParse({ orderNumber: "CCTV-LEGACY-507F1F77" }).success).toBe(true);
  });

  it("rejects malformed order numbers", () => {
    expect(orderNumberParamsValidate.safeParse({ orderNumber: "12345" }).success).toBe(false);
  });
});

describe("reconcilePaymentValidate", () => {
  it("requires a resolution and an attributable reason", () => {
    expect(reconcilePaymentValidate.safeParse({ resolution: "paid", reason: "Bank transfer" }).success).toBe(true);
    expect(reconcilePaymentValidate.safeParse({ resolution: "paid" }).success).toBe(false);
    expect(reconcilePaymentValidate.safeParse({ resolution: "refund", reason: "x" }).success).toBe(false);
  });
});
