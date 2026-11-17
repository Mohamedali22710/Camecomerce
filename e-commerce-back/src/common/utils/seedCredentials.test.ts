import { describe, expect, it } from "@jest/globals";

import { readSeedCredentials } from "./seedCredentials.js";

const valid = {
  SEED_ADMIN_EMAIL: "Admin@Example.com",
  SEED_ADMIN_PASSWORD: "a-strong-password",
};

describe("readSeedCredentials", () => {
  it("normalizes the email, keeps the password, and defaults resetPassword to false", () => {
    expect(readSeedCredentials(valid)).toEqual({
      email: "admin@example.com",
      password: "a-strong-password",
      resetPassword: false,
    });
  });

  it('honours resetPassword only when explicitly set to "true"', () => {
    expect(readSeedCredentials({ ...valid, SEED_ADMIN_RESET_PASSWORD: "true" }).resetPassword).toBe(true);
    expect(readSeedCredentials({ ...valid, SEED_ADMIN_RESET_PASSWORD: "yes" }).resetPassword).toBe(false);
  });

  it("requires both credentials instead of falling back to defaults", () => {
    expect(() => readSeedCredentials({})).toThrow(/SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are required/);
    expect(() => readSeedCredentials({ SEED_ADMIN_EMAIL: valid.SEED_ADMIN_EMAIL })).toThrow(/required/);
    expect(() => readSeedCredentials({ SEED_ADMIN_PASSWORD: valid.SEED_ADMIN_PASSWORD })).toThrow(/required/);
  });

  it("rejects an invalid email", () => {
    expect(() => readSeedCredentials({ ...valid, SEED_ADMIN_EMAIL: "not-an-email" })).toThrow(/valid email address/);
  });

  it("rejects passwords shorter than 12 characters", () => {
    expect(() => readSeedCredentials({ ...valid, SEED_ADMIN_PASSWORD: "short" })).toThrow(/at least 12 characters/);
    expect(readSeedCredentials({ ...valid, SEED_ADMIN_PASSWORD: "123456789012" }).password).toBe("123456789012");
  });

  it("never includes the supplied password in an error message", () => {
    const password = "short-secret";
    let message = "";
    try {
      readSeedCredentials({ SEED_ADMIN_EMAIL: "bad-email", SEED_ADMIN_PASSWORD: password });
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(message).not.toContain(password);
  });
});
