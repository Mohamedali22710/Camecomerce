import { describe, expect, it } from "@jest/globals";

import { signupValidate } from "./auth.validate.js";

describe("signupValidate", () => {
  it("normalizes the email and keeps the requested role", () => {
    const result = signupValidate.safeParse({
      email: "  Admin@Example.COM ",
      password: "strong-pass",
      confirmPassword: "strong-pass",
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
      password: "strong-pass",
      confirmPassword: "different-pass",
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
      password: "short",
      confirmPassword: "short",
      phone: "+966500000000",
    });

    expect(result.success).toBe(false);
  });

  it("rejects a missing or blank phone number", () => {
    const result = signupValidate.safeParse({
      email: "user@example.com",
      password: "strong-pass",
      confirmPassword: "strong-pass",
      phone: "",
    });

    expect(result.success).toBe(false);
  });

  it("accepts a valid international phone number", () => {
    const result = signupValidate.safeParse({
      email: "user@example.com",
      password: "strong-pass",
      confirmPassword: "strong-pass",
      phone: "+966500000000",
    });

    expect(result.success).toBe(true);
  });
});
