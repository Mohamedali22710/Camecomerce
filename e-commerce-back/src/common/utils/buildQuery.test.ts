import assert from "node:assert/strict";
import test from "node:test";

import { buildQuery } from "./buildQuery.js";
import { HttpError } from "./httpError.js";

const isBadRequest = (error: unknown): boolean =>
  error instanceof HttpError && error.status === 400;

test("buildQuery applies defaults", () => {
  const result = buildQuery({ reqQuery: {} });

  assert.deepEqual(result.where, {});
  assert.equal(result.page, 1);
  assert.equal(result.limit, 10);
  assert.equal(result.offset, 0);
  assert.deepEqual(result.order, { createdAt: -1 });
});

test("buildQuery parses pagination", () => {
  const result = buildQuery({ reqQuery: { page: "3", limit: "25" } });

  assert.equal(result.page, 3);
  assert.equal(result.limit, 25);
  assert.equal(result.offset, 50);
});

test("buildQuery rejects invalid pagination", () => {
  assert.throws(() => buildQuery({ reqQuery: { page: "0" } }), isBadRequest);
  assert.throws(() => buildQuery({ reqQuery: { limit: "101" } }), isBadRequest);
  assert.throws(() => buildQuery({ reqQuery: { page: "abc" } }), isBadRequest);
});

test("buildQuery builds a price range", () => {
  const result = buildQuery({ reqQuery: { minPrice: "10", maxPrice: "99.5" } });

  assert.deepEqual(result.where.price, { $gte: 10, $lte: 99.5 });
});

test("buildQuery rejects an inverted price range", () => {
  assert.throws(
    () => buildQuery({ reqQuery: { minPrice: "100", maxPrice: "10" } }),
    isBadRequest,
  );
});

test("buildQuery escapes regular-expression characters in search", () => {
  const result = buildQuery({ reqQuery: { search: "cam(era)+" } });
  const regex = result.where.$or[0].en_name as RegExp;

  assert.equal(regex.source, "cam\\(era\\)\\+");
  assert.equal(regex.flags, "i");
});

test("buildQuery accepts allow-listed sort fields only", () => {
  const result = buildQuery({ reqQuery: { sort: "price_desc" } });
  assert.deepEqual(result.order, { price: -1 });

  assert.throws(() => buildQuery({ reqQuery: { sort: "password_desc" } }), isBadRequest);
  assert.throws(() => buildQuery({ reqQuery: { sort: "price_up" } }), isBadRequest);
});

test("buildQuery merges extraWhere without mutating it", () => {
  const extraWhere = { isActive: true };
  const result = buildQuery({ reqQuery: { search: "camera" }, extraWhere });

  assert.equal(result.where.isActive, true);
  assert.ok(Array.isArray(result.where.$or));
  assert.deepEqual(extraWhere, { isActive: true });
});
