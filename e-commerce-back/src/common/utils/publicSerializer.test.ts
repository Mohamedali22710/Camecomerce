import { describe, expect, it } from "@jest/globals";

import { toPublicJson } from "./publicSerializer.js";

describe("toPublicJson", () => {
  it("removes admin audit fields recursively, including populated products", () => {
    const input = {
      _id: "category-1",
      en_name: "Cameras",
      addedByEmail: "admin@example.com",
      __v: 0,
      subcategories: [
        {
          en_name: "Indoor",
          addedByEmail: "admin@example.com",
          products: [{ en_name: "Camera", addedByEmail: "admin@example.com", price: 100 }],
        },
      ],
    };

    const result = toPublicJson(input);

    expect(result).toEqual({
      _id: "category-1",
      en_name: "Cameras",
      subcategories: [
        {
          en_name: "Indoor",
          products: [{ en_name: "Camera", price: 100 }],
        },
      ],
    });
    expect(JSON.stringify(result)).not.toContain("addedByEmail");
  });

  it("keeps arrays and primitive values intact", () => {
    expect(toPublicJson([{ addedByEmail: "x", id: 1 }])).toEqual([{ id: 1 }]);
    expect(toPublicJson("plain")).toBe("plain");
  });

  it("handles missing values defensively", () => {
    expect(toPublicJson(null)).toBeNull();
    expect(toPublicJson(undefined)).toBeUndefined();
  });
});
