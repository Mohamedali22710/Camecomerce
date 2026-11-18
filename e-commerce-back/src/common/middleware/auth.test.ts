import { describe, expect, it, jest } from "@jest/globals";

import { AuthAccount, createAuthMiddleware, generateAccessToken } from "./auth.js";

const USER_ID = "507f1f77bcf86cd799439011";

interface FakeResponse {
  statusCode: number | null;
  body: unknown;
  status: (code: number) => FakeResponse;
  json: (payload: unknown) => FakeResponse;
}

const createResponse = (): FakeResponse => {
  const response: FakeResponse = {
    statusCode: null,
    body: null,
    status(code: number) {
      response.statusCode = code;
      return response;
    },
    json(payload: unknown) {
      response.body = payload;
      return response;
    },
  };
  return response;
};

const runAuth = async (tokenRole: string, account: AuthAccount | null) => {
  const token = generateAccessToken({ _id: USER_ID, role: tokenRole });
  const req = {
    headers: { authorization: `${tokenRole} ${token}` },
  } as any;
  const res = createResponse();
  const next = jest.fn();
  const middleware = createAuthMiddleware(async () => account);

  await middleware(req, res as any, next);
  return { req, res, next };
};

describe("auth middleware account-state checks", () => {
  it("attaches an active user whose stored role matches the token", async () => {
    const { req, res, next } = await runAuth("user", {
      role: "user",
      isActive: true,
      isBlocked: false,
    });

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBeNull();
    expect(req.user).toEqual({ _id: USER_ID, role: "user" });
    expect(req.bearer).toBe("user");
  });

  it("rejects a blocked account even when the token signature is valid", async () => {
    const { res, next } = await runAuth("user", {
      role: "user",
      isActive: true,
      isBlocked: true,
    });

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
  });

  it("rejects a deactivated account", async () => {
    const { res, next } = await runAuth("user", {
      role: "user",
      isActive: false,
      isBlocked: false,
    });

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
  });

  it("rejects a token whose role no longer matches the stored account", async () => {
    const { res, next } = await runAuth("admin", {
      role: "user",
      isActive: true,
      isBlocked: false,
    });

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
  });

  it("rejects a token for an account that no longer exists", async () => {
    const { res, next } = await runAuth("user", null);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
  });

  it("rejects an unknown token role before any lookup", async () => {
    const req = {
      headers: { authorization: "user not-a-valid-token" },
    } as any;
    const res = createResponse();
    const next = jest.fn();

    await createAuthMiddleware(async () => null)(req, res as any, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
  });
});
