import { describe, expect, it } from "@jest/globals";

import { buildQuery } from "./buildQuery.js";
import { HttpError } from "./httpError.js";

const expectBadRequest = (callback: () => unknown): void => {
  expect(callback).toThrow(HttpError);
};

describe("buildQuery", () => {
  it("applies defaults", () => {
    const result = buildQuery({ reqQuery: {} });

    expect(result.where).toEqual({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
    expect(result.offset).toBe(0);
    expect(result.order).toEqual({ createdAt: -1 });
  });

  it("parses pagination", () => {
    const result = buildQuery({ reqQuery: { page: "3", limit: "25" } });

    expect(result.page).toBe(3);
    expect(result.limit).toBe(25);
    expect(result.offset).toBe(50);
  });

  it.each([{ page: "0" }, { limit: "101" }, { page: "abc" }, { limit: "1.5" }])(
    "rejects invalid pagination %p",
    (query) => {
      expectBadRequest(() => buildQuery({ reqQuery: query }));
    },
  );

  it("builds a price range", () => {
    const result = buildQuery({ reqQuery: { minPrice: "10", maxPrice: "99.5" } });

    expect(result.where.price).toEqual({ $gte: 10, $lte: 99.5 });
  });

  it("rejects an inverted price range", () => {
    expectBadRequest(() =>
      buildQuery({ reqQuery: { minPrice: "100", maxPrice: "10" } }),
    );
  });

  it("escapes regular-expression characters in search", () => {
    const result = buildQuery({ reqQuery: { search: "cam(era)+" } });
    const regex = result.where.$or[0].en_name as RegExp;

    expect(regex.source).toBe("cam\\(era\\)\\+");
    expect(regex.flags).toBe("i");
  });

  it("accepts allow-listed sort fields only", () => {
    expect(buildQuery({ reqQuery: { sort: "price_desc" } }).order).toEqual({
      price: -1,
    });
    expect(buildQuery({ reqQuery: { sort: "en_name_asc" } }).order).toEqual({
      en_name: 1,
    });

    expectBadRequest(() => buildQuery({ reqQuery: { sort: "password_desc" } }));
    expectBadRequest(() => buildQuery({ reqQuery: { sort: "price_up" } }));
  });

  it("merges extraWhere without mutating it", () => {
    const extraWhere = { isActive: true };
    const result = buildQuery({ reqQuery: { search: "camera" }, extraWhere });

    expect(result.where.isActive).toBe(true);
    expect(Array.isArray(result.where.$or)).toBe(true);
    expect(extraWhere).toEqual({ isActive: true });
  });
});
