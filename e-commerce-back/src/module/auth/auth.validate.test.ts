import { describe, expect, it } from "@jest/globals";

import { signupValidate } from "./auth.validate.js";

describe("signupValidate", () => {
  it("normalizes the email and keeps the requested role", () => {
    const result = signupValidate.safeParse({
      email: "  Admin@Example.COM ",
      password: "StrongPassword1",
      confirmPassword: "StrongPassword1",
      role: "admin",
      phone: "+966500000000",
    });

    expect(result.success).toBe(true);
    if (!result.success) {return;}
    expect(result.data.email).toBe("admin@example.com");
    expect(result.data.role).toBe("admin");
  });

  it("rejects a password confirmation mismatch", () => {
    const result = signupValidate.safeParse({
      email: "user@example.com",
      password: "StrongPassword1",
      confirmPassword: "DifferentPassword2",
      phone: "+966500000000",
    });

    expect(result.success).toBe(false);
    if (result.success) {return;}
    expect(result.error.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ["confirmPassword"],
          message: "Passwords do not match",
        }),
      ]),
    );
  });

  it("rejects a password shorter than eight characters", () => {
    const result = signupValidate.safeParse({
      email: "user@example.com",
      password: "Sh1",
      confirmPassword: "Sh1",
      phone: "+966500000000",
    });

    expect(result.success).toBe(false);
  });

  it("rejects a password without uppercase letters", () => {
    const result = signupValidate.safeParse({
      email: "user@example.com",
      password: "weakpassword1",
      confirmPassword: "weakpassword1",
      phone: "+966500000000",
    });

    expect(result.success).toBe(false);
    if (result.success) {return;}
    expect(result.error.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: "Password must contain at least one uppercase letter",
        }),
      ]),
    );
  });

  it("rejects a password without lowercase letters", () => {
    const result = signupValidate.safeParse({
      email: "user@example.com",
      password: "STRONGPASSWORD1",
      confirmPassword: "STRONGPASSWORD1",
      phone: "+966500000000",
    });

    expect(result.success).toBe(false);
    if (result.success) {return;}
    expect(result.error.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: "Password must contain at least one lowercase letter",
        }),
      ]),
    );
  });

  it("rejects a password without numbers", () => {
    const result = signupValidate.safeParse({
      email: "user@example.com",
      password: "StrongPasswordNoNum",
      confirmPassword: "StrongPasswordNoNum",
      phone: "+966500000000",
    });

    expect(result.success).toBe(false);
    if (result.success) {return;}
    expect(result.error.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: "Password must contain at least one number",
        }),
      ]),
    );
  });

  it("rejects an email longer than 255 characters", () => {
    const longPrefix = "a".repeat(250);
    const result = signupValidate.safeParse({
      email: `${longPrefix}@example.com`,
      password: "StrongPassword1",
      confirmPassword: "StrongPassword1",
      phone: "+966500000000",
    });

    expect(result.success).toBe(false);
    if (result.success) {return;}
    expect(result.error.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: "Email is too long",
        }),
      ]),
    );
  });

  it("rejects a missing or blank phone number", () => {
    const result = signupValidate.safeParse({
      email: "user@example.com",
      password: "StrongPassword1",
      confirmPassword: "StrongPassword1",
      phone: "",
    });

    expect(result.success).toBe(false);
  });

  it("accepts a valid international phone number and strong password", () => {
    const result = signupValidate.safeParse({
      email: "user@example.com",
      password: "StrongPassword1",
      confirmPassword: "StrongPassword1",
      phone: "+966500000000",
    });

    expect(result.success).toBe(true);
  });
});
