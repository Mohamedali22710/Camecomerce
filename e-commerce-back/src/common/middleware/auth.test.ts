import { describe, expect, it } from "@jest/globals";

import { env } from "../../../config/env.service.js";

import {
  generateAccessToken,
  generatePurposeToken,
  generateRefreshToken,
  getSignature,
  isRole,
  verifyToken,
} from "./auth.js";

const userId = "507f1f77bcf86cd799439011";

describe("JWT purpose scoping", () => {
  it("rejects an access token where another purpose is expected", () => {
    const accessToken = generateAccessToken({ _id: userId, role: "user" });

    expect(accessToken).toBeDefined();
    expect(() =>
      verifyToken(accessToken!, getSignature("user")!, "refresh"),
    ).toThrow("Invalid token type");
  });

  it("accepts a refresh token with the refresh signature", () => {
    const refreshToken = generateRefreshToken({ _id: userId, role: "user" });
    const refreshSecret = `${getSignature("user")}_refresh`;

    expect(refreshToken).toBeDefined();
    expect(verifyToken(refreshToken!, refreshSecret, "refresh")).toMatchObject({
      _id: userId,
      role: "user",
      type: "refresh",
    });
  });

  it("rejects a reset token where a verification token is expected", () => {
    const resetToken = generatePurposeToken(userId, "reset", "15m");

    expect(resetToken).toBeDefined();
    expect(() =>
      verifyToken(resetToken!, env.verifySignature!, "verify"),
    ).toThrow("Invalid token type");
  });

  it("does not issue tokens for an unknown role", () => {
    expect(generateAccessToken({ _id: userId, role: "guest" })).toBeUndefined();
    expect(generateRefreshToken({ _id: userId, role: "guest" })).toBeUndefined();
  });
});

describe("isRole", () => {
  it.each(["user", "admin", "superAdmin"])("accepts the %s role", (role) => {
    expect(isRole(role)).toBe(true);
  });

  it.each(["guest", "", undefined, null])("rejects %p", (role) => {
    expect(isRole(role)).toBe(false);
  });
});
