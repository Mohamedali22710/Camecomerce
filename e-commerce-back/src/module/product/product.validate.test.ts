import { describe, expect, it } from "@jest/globals";

import { createProductValidate, updateProductValidate } from "./product.validate.js";

const validProduct = {
  en_name: "Indoor camera",
  en_description: "A compact indoor camera",
  price: "199.99",
  subcategoryId: "507f1f77bcf86cd799439011",
  variants: '[{"color":" White ","size":"2TB","stock":"5"}]',
};

describe("createProductValidate", () => {
  it("parses multipart JSON and coerces numeric fields", () => {
    const result = createProductValidate.safeParse(validProduct);

    expect(result.success).toBe(true);
    if (!result.success) {return;}
    expect(result.data.price).toBe(199.99);
    expect(result.data.variants).toEqual([
      { color: "White", size: "2TB", stock: 5 },
    ]);
  });

  it("fills missing variant labels with Default", () => {
    const result = createProductValidate.safeParse({
      ...validProduct,
      variants: '[{"stock":1}]',
    });

    expect(result.success).toBe(true);
    if (!result.success) {return;}
    expect(result.data.variants).toEqual([
      { color: "Default", size: "Default", stock: 1 },
    ]);
  });

  it("rejects an empty variant list", () => {
    const result = createProductValidate.safeParse({
      ...validProduct,
      variants: "[]",
    });

    expect(result.success).toBe(false);
  });

  it("rejects a variant without stock", () => {
    const result = createProductValidate.safeParse({
      ...validProduct,
      variants: '[{"color":"White","size":"2TB"}]',
    });

    expect(result.success).toBe(false);
  });

  it("accepts a product with stock and no variants", () => {
    const { variants, ...withoutVariants } = validProduct;
    const result = createProductValidate.safeParse({
      ...withoutVariants,
      stock: 50,
    });
    expect(result.success).toBe(true);
    if (!result.success) {return;}
    expect(result.data.stock).toBe(50);
  });
});

describe("updateProductValidate", () => {
  it("coerces the multipart isActive=false string to false", () => {
    const result = updateProductValidate.safeParse({ isActive: "false" });

    expect(result.success).toBe(true);
    if (!result.success) {return;}
    expect(result.data.isActive).toBe(false);
  });

  it("rejects an empty update", () => {
    expect(updateProductValidate.safeParse({}).success).toBe(false);
  });

  it("handles null, empty strings and omitted optional fields gracefully on update", () => {
    const base = {
      en_name: "Request a quotation for CCTV cameras",
      price: "1",
    };
    expect(updateProductValidate.safeParse({ ...base, variants: null }).success).toBe(true);
    expect(updateProductValidate.safeParse({ ...base, variants: "" }).success).toBe(true);
    expect(updateProductValidate.safeParse({ ...base, colorImages: null }).success).toBe(true);
    expect(updateProductValidate.safeParse({ ...base, colorImages: "" }).success).toBe(true);
    expect(updateProductValidate.safeParse({ ...base, colorImages: {} }).success).toBe(true);
    expect(updateProductValidate.safeParse({ ...base, colorImages: "{}" }).success).toBe(true);
    expect(updateProductValidate.safeParse({ ...base, colorImages: "[]" }).success).toBe(true);
    expect(updateProductValidate.safeParse({ ...base, colorImages: { Default: "https://example.com/img.jpg" } }).success).toBe(true);
    expect(updateProductValidate.safeParse({ ...base, colorImages: [{ color: "Default", imageURL: "https://example.com/img.jpg" }] }).success).toBe(true);
    expect(updateProductValidate.safeParse({ ...base, specifications: null }).success).toBe(true);
    expect(updateProductValidate.safeParse({ ...base, specifications: "" }).success).toBe(true);
    expect(updateProductValidate.safeParse({ ...base, subcategoryId: "" }).success).toBe(true);
    expect(updateProductValidate.safeParse({ ...base, subcategoryId: null }).success).toBe(true);
    expect(updateProductValidate.safeParse({ ...base, subcategoryId: "507f1f77bcf86cd799439011" }).success).toBe(true);
  });
});
