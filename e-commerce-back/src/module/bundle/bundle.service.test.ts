import { describe, expect, it } from "@jest/globals";

import { IBundle } from "../../database/model/bundle.model.js";
import { IProduct } from "../../database/model/product.model.js";

import { assertComponentIndexesExist, buildComponentWarnings, serializePublicBundle } from "./bundle.service.js";

const product = {
  _id: "p1",
  en_name: "Indoor camera",
  ar_name: "كاميرا داخلية",
  fr_name: null,
  isActive: true,
} as unknown as IProduct;

const rawBundle = {
  _id: "b1",
  code: "KIT-4CAM",
  en_name: "4-camera kit",
  basePrice: 1000,
  discount: 10,
  cameras: [{ productId: "p1", color: "White", size: "Default", quantity: 4 }],
  hddOptions: [{ code: "1TB", labelEn: "1 TB", priceDelta: 0 }],
  installationOptions: [{ code: "none", labelEn: "Without installation", priceDelta: 0 }],
  isActive: true,
};

const bundle = {
  ...rawBundle,
  toJSON: () => ({ ...rawBundle, addedByEmail: "admin@example.com", __v: 0 }),
} as unknown as IBundle;

describe("bundle component validation", () => {
  it("reports the missing component index with a 404", () => {
    expect(() => assertComponentIndexesExist([{ productId: "p1" }, { productId: "missing" }], new Set(["p1"]))).toThrow(
      /index 1/,
    );
  });

  it("accepts components whose products exist", () => {
    expect(() => assertComponentIndexesExist([{ productId: "p1" }], new Set(["p1"]))).not.toThrow();
  });

  it("warns, without failing, when a component product is inactive", () => {
    const inactive = { ...product, isActive: false } as unknown as IProduct;
    const warnings = buildComponentWarnings([{ productId: "p1" }], new Map([["p1", inactive]]));

    expect(warnings).toEqual([expect.objectContaining({ index: 0, productId: "p1" })]);
  });
});

describe("serializePublicBundle", () => {
  const serialized = serializePublicBundle(bundle, new Map([["p1", product]]));

  it("removes admin-only fields", () => {
    expect(serialized).not.toHaveProperty("addedByEmail");
    expect(serialized).not.toHaveProperty("__v");
  });

  it("adds the discounted base price and currency", () => {
    expect(serialized.finalPrice).toBe(900);
    expect(serialized.currency).toBe("SAR");
  });

  it("includes component summaries with product names", () => {
    expect(serialized.cameras).toEqual([
      expect.objectContaining({
        productId: "p1",
        en_name: "Indoor camera",
        quantity: 4,
      }),
    ]);
  });

  it("does not claim availability while DEC-01 is unresolved", () => {
    expect(serialized).not.toHaveProperty("stock");
    expect(serialized).not.toHaveProperty("availability");
  });
});
