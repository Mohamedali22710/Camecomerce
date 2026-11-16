import { describe, expect, it } from "@jest/globals";

import { HttpError } from "../../common/utils/httpError.js";

import { BundlePricingSource, discountedBundleBasePrice, resolveBundleSelection } from "./bundle.pricing.js";

const bundle: BundlePricingSource = {
  basePrice: 1000,
  discount: 10,
  hddOptions: [
    { code: "1TB", labelEn: "1 TB HDD", labelAr: "قرص 1 تيرا", priceDelta: 0 },
    { code: "2TB", labelEn: "2 TB HDD", labelAr: "قرص 2 تيرا", priceDelta: 200 },
  ],
  installationOptions: [
    { code: "none", labelEn: "Without installation", labelAr: "بدون تركيب", priceDelta: 0 },
    {
      code: "riyadh",
      labelEn: "Installation in Riyadh",
      labelAr: "تركيب في الرياض",
      priceDelta: 300,
      city: "Riyadh",
    },
  ],
};

const bundle8 = { ...bundle, basePrice: 1800 };

describe("resolveBundleSelection", () => {
  it.each([
    {
      name: "4-camera, 1TB, no installation",
      source: bundle,
      selection: { hddCode: "1TB", installationCode: "none", quantity: 1 },
      expected: 900,
    },
    {
      name: "4-camera, 2TB, Riyadh installation",
      source: bundle,
      selection: { hddCode: "2TB", installationCode: "riyadh", quantity: 1 },
      expected: 1400,
    },
    {
      name: "8-camera, 1TB, no installation",
      source: bundle8,
      selection: { hddCode: "1TB", installationCode: "none", quantity: 1 },
      expected: 1620,
    },
    {
      name: "8-camera, 2TB, Riyadh installation, quantity 2",
      source: bundle8,
      selection: { hddCode: "2TB", installationCode: "riyadh", quantity: 2 },
      expected: 4240,
    },
  ])("prices $name", ({ source, selection, expected }) => {
    expect(resolveBundleSelection(source, selection).lineTotal).toBe(expected);
  });

  it("returns resolved labels and deltas for the order snapshot", () => {
    const result = resolveBundleSelection(bundle, {
      hddCode: "2TB",
      installationCode: "riyadh",
      quantity: 1,
    });

    expect(result.hdd).toEqual({
      code: "2TB",
      labelEn: "2 TB HDD",
      labelAr: "قرص 2 تيرا",
      priceDelta: 200,
    });
    expect(result.installation).toMatchObject({
      code: "riyadh",
      priceDelta: 300,
      city: "Riyadh",
    });
    expect(result.discountedBasePrice).toBe(900);
    expect(result.discountAmount).toBe(100);
  });

  it("rejects unknown HDD and installation codes", () => {
    expect(() =>
      resolveBundleSelection(bundle, {
        hddCode: "4TB",
        installationCode: "none",
        quantity: 1,
      }),
    ).toThrow(HttpError);
    expect(() =>
      resolveBundleSelection(bundle, {
        hddCode: "1TB",
        installationCode: "jeddah",
        quantity: 1,
      }),
    ).toThrow(/Unknown installation option code/);
  });

  it("rejects a non-positive quantity", () => {
    expect(() =>
      resolveBundleSelection(bundle, {
        hddCode: "1TB",
        installationCode: "none",
        quantity: 0,
      }),
    ).toThrow(/quantity/);
  });

  it("treats a negative delta as zero and never drops below the discounted base", () => {
    const result = resolveBundleSelection(
      {
        ...bundle,
        hddOptions: [{ code: "bad", labelEn: "Bad delta", priceDelta: -250 }],
      },
      { hddCode: "bad", installationCode: "none", quantity: 1 },
    );

    expect(result.unitTotal).toBe(900);
  });

  it("rounds floating-point money correctly", () => {
    const result = resolveBundleSelection(
      {
        basePrice: 0.1,
        discount: 0,
        hddOptions: [{ code: "tiny", labelEn: "Tiny", priceDelta: 0.2 }],
        installationOptions: [{ code: "none", labelEn: "None", priceDelta: 0 }],
      },
      { hddCode: "tiny", installationCode: "none", quantity: 3 },
    );

    expect(result.unitTotal).toBe(0.3);
    expect(result.lineTotal).toBe(0.9);
  });

  it("caps the discount at 100 percent", () => {
    const result = resolveBundleSelection(
      { ...bundle, discount: 150 },
      { hddCode: "1TB", installationCode: "none", quantity: 1 },
    );

    expect(result.discount).toBe(100);
    expect(result.discountedBasePrice).toBe(0);
    expect(result.unitTotal).toBe(0);
  });
});

describe("discountedBundleBasePrice", () => {
  it("applies the percentage discount used by public listings", () => {
    expect(discountedBundleBasePrice(bundle)).toBe(900);
  });
});
