import { jest } from "@jest/globals";
import type { NextFunction, Request, Response } from "express";

import { bundleAdminOnly } from "./bundle.controller.js";

const makeResponse = () => {
  const json = jest.fn();
  const status = jest.fn(() => ({ json }));
  return { res: { status } as unknown as Response, status, json };
};

describe("bundle admin guard", () => {
  it("rejects a non-admin with 403 and does not call the handler", () => {
    const { res, status, json } = makeResponse();
    const next = jest.fn();

    bundleAdminOnly({ bearer: "user" } as Request, res, next as NextFunction);

    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith({ message: "Access denied" });
    expect(next).not.toHaveBeenCalled();
  });

  it.each(["admin", "superAdmin"])("allows %s", (role) => {
    const { res, status } = makeResponse();
    const next = jest.fn();

    bundleAdminOnly({ bearer: role } as Request, res, next as NextFunction);

    expect(next).toHaveBeenCalledTimes(1);
    expect(status).not.toHaveBeenCalled();
  });
});
