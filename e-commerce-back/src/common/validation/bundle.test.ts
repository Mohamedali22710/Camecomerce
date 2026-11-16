import { describe, expect, it } from "@jest/globals";

import { createBundleValidate, hasUniqueOptionCodes, updateBundleValidate } from "./bundle.js";

const validBundle = {
  code: "KIT-4CAM",
  en_name: "4-camera kit",
  ar_name: "طقم 4 كاميرات",
  description: "Four cameras with a recorder",
  basePrice: 1000,
  discount: 10,
  cameras: [
    {
      productId: "507f1f77bcf86cd799439011",
      color: "White",
      size: "Default",
      quantity: 4,
    },
  ],
  hddOptions: [
    { code: "1TB", labelEn: "1 TB", priceDelta: 0 },
    { code: "2TB", labelEn: "2 TB", priceDelta: 200 },
  ],
  installationOptions: [
    { code: "none", labelEn: "Without installation", priceDelta: 0 },
    { code: "riyadh", labelEn: "Riyadh", priceDelta: 300, city: "Riyadh" },
  ],
};

describe("createBundleValidate", () => {
  it("accepts a complete bundle payload", () => {
    expect(createBundleValidate.safeParse(validBundle).success).toBe(true);
  });

  it("requires at least one camera and each option list", () => {
    expect(createBundleValidate.safeParse({ ...validBundle, cameras: [] }).success).toBe(false);
    expect(createBundleValidate.safeParse({ ...validBundle, hddOptions: [] }).success).toBe(false);
    expect(createBundleValidate.safeParse({ ...validBundle, installationOptions: [] }).success).toBe(false);
  });

  it("rejects duplicate option codes inside a list", () => {
    const result = createBundleValidate.safeParse({
      ...validBundle,
      hddOptions: [
        { code: "1TB", labelEn: "1 TB", priceDelta: 0 },
        { code: "1tb", labelEn: "Duplicate", priceDelta: 100 },
      ],
    });

    expect(result.success).toBe(false);
  });

  it("rejects negative price deltas", () => {
    const result = createBundleValidate.safeParse({
      ...validBundle,
      hddOptions: [{ code: "1TB", labelEn: "1 TB", priceDelta: -1 }],
    });

    expect(result.success).toBe(false);
  });

  it("rejects a stock field until DEC-01 is resolved", () => {
    const result = createBundleValidate.safeParse({ ...validBundle, stock: 5 });

    expect(result.success).toBe(false);
  });
});

describe("updateBundleValidate", () => {
  it("rejects an empty update", () => {
    expect(updateBundleValidate.safeParse({}).success).toBe(false);
  });

  it("accepts a partial options update", () => {
    expect(
      updateBundleValidate.safeParse({
        hddOptions: [{ code: "4TB", labelEn: "4 TB", priceDelta: 400 }],
      }).success,
    ).toBe(true);
  });

  it("rejects stock input on update", () => {
    expect(updateBundleValidate.safeParse({ stock: 10 }).success).toBe(false);
  });
});

describe("hasUniqueOptionCodes", () => {
  it("compares codes case-insensitively after trimming", () => {
    expect(hasUniqueOptionCodes([{ code: "A" }, { code: " a " }])).toBe(false);
    expect(hasUniqueOptionCodes([{ code: "A" }, { code: "B" }])).toBe(true);
  });
});
