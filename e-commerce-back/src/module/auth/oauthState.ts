/** Signed, cookie-backed OAuth `state` value used to mitigate login CSRF. */
import { randomBytes } from "node:crypto";

import { Request, Response } from "express";
import jwt from "jsonwebtoken";

import { env } from "../../../config/env.service.js";

const COOKIE_NAME = "oauth_state";
const COOKIE_PATH = "/v1/auth";
const MAX_AGE_MS = 10 * 60 * 1000;

const parseCookies = (header: string | undefined): Record<string, string> => {
  if (!header) {return {};}
  return header.split(";").reduce<Record<string, string>>((cookies, part) => {
    const separator = part.indexOf("=");
    if (separator === -1) {return cookies;}
    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (key) {cookies[key] = decodeURIComponent(value);}
    return cookies;
  }, {});
};

/** Signs a `state` value and stores the same value in an HttpOnly cookie. */
export const issueOAuthState = (res: Response): string => {
  const nonce = randomBytes(16).toString("hex");
  const state = jwt.sign({ nonce }, env.verifySignature!, { expiresIn: "10m" });

  res.cookie(COOKIE_NAME, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProduction,
    maxAge: MAX_AGE_MS,
    path: COOKIE_PATH,
  });

  return state;
};

/** Validates that the callback `state` matches the HttpOnly cookie and is signed. */
export const verifyOAuthState = (req: Request): boolean => {
  const state = typeof req.query.state === "string" ? req.query.state : "";
  const cookieState = parseCookies(req.headers.cookie)[COOKIE_NAME];

  if (!state || !cookieState || state !== cookieState) {return false;}

  try {
    jwt.verify(state, env.verifySignature!);
    return true;
  } catch {
    return false;
  }
};

/** Removes the one-time OAuth state cookie. */
export const clearOAuthState = (res: Response): void => {
  res.clearCookie(COOKIE_NAME, { path: COOKIE_PATH });
};
