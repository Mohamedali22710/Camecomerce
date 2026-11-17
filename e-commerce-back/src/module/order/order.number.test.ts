import { describe, expect, it } from "@jest/globals";

import { generateOrderNumber, legacyOrderNumber, ORDER_NUMBER_PATTERN } from "./order.number.js";

const fixedDate = new Date("2026-11-17T23:30:00.000Z");

describe("generateOrderNumber", () => {
  it("formats CCTV-YYMMDD-XXXX with an injected suffix", () => {
    expect(generateOrderNumber(fixedDate, () => "ab12")).toBe("CCTV-261117-AB12");
    expect(generateOrderNumber(fixedDate, () => "ab12")).toMatch(ORDER_NUMBER_PATTERN);
  });

  it("pads and normalizes the suffix", () => {
    expect(generateOrderNumber(fixedDate, () => "7")).toBe("CCTV-261117-0007");
    expect(generateOrderNumber(fixedDate, () => "x-y/z!")).toBe("CCTV-261117-0XYZ");
  });

  it("produces a matching number with the default random suffix", () => {
    for (let index = 0; index < 50; index += 1) {
      expect(generateOrderNumber()).toMatch(ORDER_NUMBER_PATTERN);
    }
  });
});

describe("legacyOrderNumber", () => {
  it("builds a display-only number and never collides with the generated pattern", () => {
    const value = legacyOrderNumber("507f1f77bcf86cd799439011");
    expect(value).toBe("CCTV-LEGACY-99439011");
    expect(value).not.toMatch(ORDER_NUMBER_PATTERN);
  });
});
