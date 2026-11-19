import { describe, expect, it } from "@jest/globals";

import type { OrderLineSnapshot } from "../cart/cart.lines.js";

import { collectStockRequirements, parseOrderItems } from "./order.stock.js";

const product = (
  productId: string,
  color: string,
  size: string,
  quantity: number,
): OrderLineSnapshot => ({
  itemType: "product",
  productId,
  quantity,
  price: 100,
  lineTotal: 100 * quantity,
  en_name: "Camera",
  color,
  size,
});

const bundle = (quantity: number): OrderLineSnapshot => ({
  itemType: "bundle",
  bundleId: "bundle-1",
  bundleCode: "KIT-4",
  en_name: "4 camera kit",
  quantity,
  unitPrice: 1000,
  lineTotal: 1000 * quantity,
  hdd: { code: "1TB", labelEn: "1TB", labelAr: null, priceDelta: 0 },
  installation: { code: "BASIC", labelEn: "Basic", labelAr: null, priceDelta: 0 },
  cameras: [
    { productId: "camera-a", color: "White", size: "Default", quantity: 4 },
    { productId: "camera-b", color: "Black", size: "Default", quantity: 1 },
  ],
});

describe("collectStockRequirements", () => {
  it("maps a product line to one variant requirement", () => {
    expect(collectStockRequirements([product("camera-a", "White", "Default", 2)])).toEqual([
      { productId: "camera-a", color: "White", size: "Default", quantity: 2 },
    ]);
  });

  it("multiplies bundle components by the bundle quantity", () => {
    expect(collectStockRequirements([bundle(2)])).toEqual([
      { productId: "camera-a", color: "White", size: "Default", quantity: 8 },
      { productId: "camera-b", color: "Black", size: "Default", quantity: 2 },
    ]);
  });

  it("aggregates the same variant across product and bundle lines", () => {
    const requirements = collectStockRequirements([
      product("camera-a", "White", "Default", 1),
      bundle(1),
      product("camera-a", "White", "Default", 2),
    ]);

    expect(requirements).toEqual([
      { productId: "camera-a", color: "White", size: "Default", quantity: 7 },
      { productId: "camera-b", color: "Black", size: "Default", quantity: 1 },
    ]);
  });

  it("ignores malformed quantities instead of reserving negative stock", () => {
    const broken = { ...product("camera-a", "White", "Default", 1), quantity: 0 } as OrderLineSnapshot;
    expect(collectStockRequirements([broken])).toEqual([]);
  });
});

describe("parseOrderItems", () => {
  it("returns an empty list for malformed order JSON", () => {
    expect(parseOrderItems("not-json")).toEqual([]);
    expect(parseOrderItems('{"itemType":"product"}')).toEqual([]);
  });

  it("parses a stored array", () => {
    expect(parseOrderItems(JSON.stringify([product("p", "W", "D", 1)]))).toHaveLength(1);
  });
});
