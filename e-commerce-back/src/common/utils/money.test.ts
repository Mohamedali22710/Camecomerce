import { describe, expect, it } from "@jest/globals";

import { HttpError } from "./httpError.js";
import { fromMinorUnits, toMinorUnits } from "./money.js";

describe("toMinorUnits", () => {
  it.each([
    [12.34, 1234],
    [0, 0],
    [0.01, 1],
    [0.1 + 0.2, 30],
    [19.99, 1999],
    [1250, 125000],
  ])("converts %p SAR to %p halalas", (amount, expected) => {
    expect(toMinorUnits(amount)).toBe(expected);
  });

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])("rejects invalid amount %p", (amount) => {
    expect(() => toMinorUnits(amount)).toThrow(HttpError);
  });
});

describe("fromMinorUnits", () => {
  it.each([
    [1234, 12.34],
    [0, 0],
    [1, 0.01],
    [30, 0.3],
  ])("converts %p halalas to %p SAR", (minor, expected) => {
    expect(fromMinorUnits(minor)).toBe(expected);
  });

  it.each([-1, 1.5, Number.NaN])("rejects invalid minor units %p", (minor) => {
    expect(() => fromMinorUnits(minor)).toThrow(HttpError);
  });
});
