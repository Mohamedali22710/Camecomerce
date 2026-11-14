/** JWT authentication middleware — verifies the token and attaches `req.user`.
 *
 * Every token carries a `type` claim ("access", "refresh", "verify", "reset")
 * so a token issued for one purpose can never be replayed for another.
 */
import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

import { env } from "../../../config/env.service.js";

export type Role = "admin" | "user" | "superAdmin";
export type TokenType = "access" | "refresh" | "verify" | "reset";

interface UserSearch {
  _id?: string;
  email?: string;
  role?: string;
}

interface TokenPayload extends JwtPayload {
  _id?: string;
  role?: string;
  type?: string;
}

declare global {
  namespace Express {
    interface User {
      _id?: string;
      role?: string;
    }
    interface Request {
      /** Role carried by the verified token (kept for backward compatibility). */
      bearer?: string;
    }
  }
}

/** Selects the JWT secret associated with a role. */
export const getSignature = (bearer: string): string | undefined => {
  switch (bearer) {
    case "admin":
      return env.signatureAdmin;
    case "user":
      return env.signatureUser;
    case "superAdmin":
      return env.SIGNATURE_SUPER_ADMIN;
    default:
      return undefined;
  }
};

/** Checks that a value is one of the supported application roles. */
export const isRole = (value: unknown): value is Role =>
  value === "admin" || value === "user" || value === "superAdmin";

const attachUser = (req: Request, payload: TokenPayload, bearer: string): boolean => {
  if (payload.role && payload.role !== bearer) {return false;}
  req.user = { _id: payload._id, role: payload.role || bearer };
  req.bearer = bearer;
  return true;
};

/** Verifies a JWT and asserts that its purpose matches the expected type. */
export const verifyToken = (
  token: string,
  secret: string,
  expectedType: TokenType,
): TokenPayload => {
  const payload = jwt.verify(token, secret) as TokenPayload;
  if (payload.type !== expectedType) {
    throw new jwt.JsonWebTokenError("Invalid token type");
  }
  return payload;
};

/** Optional auth — attaches the user when a valid access token is present but never rejects. */
export const softAuth = (req: Request, _res: Response, next: NextFunction): void => {
  const { authorization } = req.headers;
  if (!authorization) {return next();}

  const [bearer, token] = authorization.split(" ");
  if (!bearer || !token) {return next();}

  const signature = getSignature(bearer);
  if (!signature) {return next();}

  try {
    const payload = verifyToken(token, signature, "access");
    attachUser(req, payload, bearer);
  } catch {
    // Ignore invalid tokens for optional authentication.
  }

  next();
};

/** Verifies the JWT from the Authorization header and attaches the user. */
export const auth = (req: Request, res: Response, next: NextFunction): void => {
  const { authorization } = req.headers;
  if (!authorization) {
    res.status(401).json({ message: "Login required" });
    return;
  }

  const [bearer, token] = authorization.split(" ");
  if (!bearer || !token) {
    res.status(401).json({ message: "Invalid token format" });
    return;
  }

  const signature = getSignature(bearer);
  if (!signature) {
    res.status(401).json({ message: "Invalid token" });
    return;
  }

  try {
    const payload = verifyToken(token, signature, "access");
    if (!payload._id || !attachUser(req, payload, bearer)) {
      res.status(401).json({ message: "Invalid token" });
      return;
    }
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
    return;
  }

  next();
};

/** Creates a short-lived JWT access token. */
export const generateAccessToken = (userSearch: UserSearch): string | undefined => {
  const role = userSearch.role || "user";
  const signature = getSignature(role);
  if (!signature) {return undefined;}
  return jwt.sign({ _id: userSearch._id, role, type: "access" }, signature, {
    expiresIn: env.accessToken as jwt.SignOptions["expiresIn"],
  });
};

/** Creates a long-lived JWT refresh token. */
export const generateRefreshToken = (userSearch: UserSearch): string | undefined => {
  const role = userSearch.role || "user";
  const signature = getSignature(role);
  if (!signature) {return undefined;}
  return jwt.sign({ _id: userSearch._id, role, type: "refresh" }, `${signature}_refresh`, {
    expiresIn: env.refreshToken as jwt.SignOptions["expiresIn"],
  });
};

/** Creates a single-purpose token (email verification or password reset). */
export const generatePurposeToken = (
  userId: string,
  type: Extract<TokenType, "verify" | "reset">,
  expiresIn: string,
): string | undefined => {
  if (!env.verifySignature) {return undefined;}
  return jwt.sign({ _id: userId, type }, env.verifySignature, {
    expiresIn: expiresIn as jwt.SignOptions["expiresIn"],
  });
};
