import { describe, expect, it } from "@jest/globals";

import { MAX_SPECIFICATIONS, parseSpecifications, specificationsSchema } from "./specification.js";

const validSpecification = {
  keyEn: " Resolution ",
  keyAr: "الدقة",
  valueEn: " 4MP ",
  valueAr: "4 ميجابكسل",
  unit: "MP",
};

describe("product specifications", () => {
  it("parses and normalizes a valid array", () => {
    const result = specificationsSchema.safeParse([validSpecification]);

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }
    expect(result.data[0]).toMatchObject({
      keyEn: "Resolution",
      valueEn: "4MP",
      unit: "MP",
    });
  });

  it("accepts a JSON string from multipart form data", () => {
    const result = specificationsSchema.safeParse(JSON.stringify([validSpecification]));

    expect(result.success).toBe(true);
  });

  it("rejects more than the bounded number of entries", () => {
    const tooMany = Array.from({ length: MAX_SPECIFICATIONS + 1 }, (_, index) => ({
      ...validSpecification,
      keyEn: `Key ${index}`,
    }));

    expect(specificationsSchema.safeParse(tooMany).success).toBe(false);
  });

  it("rejects an oversized value", () => {
    const result = specificationsSchema.safeParse([{ ...validSpecification, valueEn: "x".repeat(201) }]);

    expect(result.success).toBe(false);
  });

  it("returns an empty array for legacy null or malformed rows", () => {
    expect(parseSpecifications(null)).toEqual([]);
    expect(parseSpecifications(undefined)).toEqual([]);
    expect(parseSpecifications("not-json")).toEqual([]);
  });

  it("round-trips stored JSON", () => {
    expect(parseSpecifications(JSON.stringify([validSpecification]))).toEqual([
      {
        keyEn: "Resolution",
        keyAr: "الدقة",
        valueEn: "4MP",
        valueAr: "4 ميجابكسل",
        unit: "MP",
      },
    ]);
  });
});
