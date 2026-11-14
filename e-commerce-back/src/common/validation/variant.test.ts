import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_VARIANT_VALUE,
  findVariant,
  normalizeVariant,
  parseVariants,
} from "./variant.js";

test("normalizeVariant falls back to Default for blank labels", () => {
  assert.deepEqual(normalizeVariant({ color: "  ", size: "", stock: 4 }), {
    color: DEFAULT_VARIANT_VALUE,
    size: DEFAULT_VARIANT_VALUE,
    stock: 4,
  });
});

test("normalizeVariant keeps free-form CCTV labels", () => {
  assert.deepEqual(normalizeVariant({ color: "White", size: "2TB", stock: 3 }), {
    color: "White",
    size: "2TB",
    stock: 3,
  });
});

test("normalizeVariant coerces stock and tolerates bad values", () => {
  assert.equal(normalizeVariant({ stock: "7" as unknown as number }).stock, 7);
  assert.equal(normalizeVariant({ stock: "abc" as unknown as number }).stock, 0);
});

test("parseVariants handles null, malformed JSON, and non-array payloads", () => {
  assert.deepEqual(parseVariants(null), []);
  assert.deepEqual(parseVariants("{not json"), []);
  assert.deepEqual(parseVariants('{"color":"White"}'), []);
});

test("parseVariants normalizes each entry and skips null entries", () => {
  const raw = JSON.stringify([
    { color: "White", size: "2TB", stock: 5 },
    null,
    { color: "", size: "", stock: "2" },
  ]);

  assert.deepEqual(parseVariants(raw), [
    { color: "White", size: "2TB", stock: 5 },
    { color: DEFAULT_VARIANT_VALUE, size: DEFAULT_VARIANT_VALUE, stock: 2 },
  ]);
});

test("findVariant matches on normalized labels", () => {
  const variants = parseVariants(
    JSON.stringify([{ color: "White", size: DEFAULT_VARIANT_VALUE, stock: 2 }]),
  );

  assert.equal(findVariant(variants, " White ", "")?.stock, 2);
  assert.equal(findVariant(variants, "Black", DEFAULT_VARIANT_VALUE), undefined);
});
