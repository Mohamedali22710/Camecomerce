import { describe, expect, it } from "@jest/globals";

import {
  DEFAULT_VARIANT_VALUE,
  normalizeVariant,
  parseVariants,
  findVariant,
} from "./variant.js";

describe("normalizeVariant", () => {
  it.each([
    [" White ", " 2TB ", "White", "2TB"],
    ["", "   ", DEFAULT_VARIANT_VALUE, DEFAULT_VARIANT_VALUE],
    [undefined, null, DEFAULT_VARIANT_VALUE, DEFAULT_VARIANT_VALUE],
  ])("normalizes labels %p/%p", (color, size, expectedColor, expectedSize) => {
    const variant = normalizeVariant({
      color: color as string,
      size: size as string,
      stock: 0,
    });

    expect(variant.color).toBe(expectedColor);
    expect(variant.size).toBe(expectedSize);
  });

  it("keeps free-form CCTV labels and coerces stock", () => {
    expect(normalizeVariant({ color: "White", size: "2TB", stock: 12 })).toEqual({
      color: "White",
      size: "2TB",
      stock: 12,
    });
  });

  it("tolerates invalid stock values", () => {
    expect(normalizeVariant({ stock: Number("not-a-number") }).stock).toBe(0);
  });
});

describe("parseVariants", () => {
  it.each([null, undefined, "", "not-json", '{"color":"White"}'])(
    "returns an empty list for %p",
    (raw) => {
      expect(parseVariants(raw)).toEqual([]);
    },
  );

  it("normalizes entries and skips null items", () => {
    const raw = JSON.stringify([
      { color: " White ", size: "2TB", stock: 3 },
      null,
      { color: "", size: "", stock: "4" },
    ]);

    expect(parseVariants(raw)).toEqual([
      { color: "White", size: "2TB", stock: 3 },
      { color: DEFAULT_VARIANT_VALUE, size: DEFAULT_VARIANT_VALUE, stock: 4 },
    ]);
  });
});

describe("findVariant", () => {
  const variants = [{ color: "White", size: "2TB", stock: 5 }];

  it("matches on trimmed labels", () => {
    expect(findVariant(variants, " White ", "2TB ")).toEqual(variants[0]);
  });

  it("returns undefined when the variant does not exist", () => {
    expect(findVariant(variants, "Black", "2TB")).toBeUndefined();
  });
});
