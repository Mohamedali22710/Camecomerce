/** JWT authentication middleware — verifies the token and attaches `req.user`.
 *
 * Every token carries a `type` claim ("access", "refresh", "verify", "reset")
 * so a token issued for one purpose can never be replayed for another.
 *
 * Security: a valid signature is not enough. The account is reloaded on every
 * authenticated request so blocked/deactivated users and tokens carrying a stale
 * role stop working immediately instead of at token expiry. The lookup is
 * injectable so the rule can be unit-tested without a database.
 */
import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

import { env } from "../../../config/env.service.js";
import { userModel } from "../../database/model/user.model.js";

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

/** The account fields that gate an otherwise valid token. */
export interface AuthAccount {
  role?: string;
  isActive?: boolean;
  isBlocked?: boolean;
}

/** Loads the current account state; `null` means the account no longer exists. */
export type UserLoader = (userId: string) => Promise<AuthAccount | null>;

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

/** Reloads the account state that must gate an otherwise valid token. */
const loadActiveUser: UserLoader = async (userId) => {
  const user = await userModel.findById(userId).select("role isActive isBlocked").lean();
  if (!user) {
    return null;
  }
  return { role: user.role, isActive: user.isActive, isBlocked: user.isBlocked };
};

/**
 * True only when the account still exists, is active, is not blocked, still has
 * the role the token was signed for, and that role matches the auth scheme.
 */
export const isAccountAllowed = (
  user: AuthAccount | null,
  bearer: string,
  tokenRole?: string,
): user is AuthAccount & { role: Role } => {
  if (!user || user.isBlocked || !user.isActive) {
    return false;
  }
  if (!isRole(user.role) || user.role !== bearer) {
    return false;
  }
  if (tokenRole && tokenRole !== user.role) {
    return false;
  }
  return true;
};

const attachVerifiedUser = async (
  req: Request,
  payload: TokenPayload,
  bearer: string,
  loadUser: UserLoader,
): Promise<boolean> => {
  if (!payload._id) {
    return false;
  }

  const user = await loadUser(String(payload._id));
  if (!isAccountAllowed(user, bearer, payload.role)) {
    return false;
  }

  req.user = { _id: String(payload._id), role: user.role };
  req.bearer = user.role;
  return true;
};

/** Verifies a JWT and asserts that its purpose matches the expected type. */
export const verifyToken = (token: string, secret: string, expectedType: TokenType): TokenPayload => {
  const payload = jwt.verify(token, secret) as TokenPayload;
  if (payload.type !== expectedType) {
    throw new jwt.JsonWebTokenError("Invalid token type");
  }
  return payload;
};

const readBearerToken = (authorization: string | undefined): [string, string] | null => {
  if (!authorization) {
    return null;
  }
  const [bearer, token] = authorization.split(" ");
  if (!bearer || !token) {
    return null;
  }
  return [bearer, token];
};

/** Builds the optional-auth middleware around an injectable account lookup. */
export const createSoftAuthMiddleware =
  (loadUser: UserLoader) =>
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const credentials = readBearerToken(req.headers.authorization);
    if (!credentials) {
      return next();
    }

    const [bearer, token] = credentials;
    const signature = getSignature(bearer);
    if (!signature) {
      return next();
    }

    try {
      const payload = verifyToken(token, signature, "access");
      await attachVerifiedUser(req, payload, bearer, loadUser);
    } catch {
      // Ignore invalid, expired, blocked, or stale tokens for optional auth.
    }

    next();
  };

/** Builds the required-auth middleware around an injectable account lookup. */
export const createAuthMiddleware =
  (loadUser: UserLoader) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { authorization } = req.headers;
    if (!authorization) {
      res.status(401).json({ message: "Login required" });
      return;
    }

    const credentials = readBearerToken(authorization);
    if (!credentials) {
      res.status(401).json({ message: "Invalid token format" });
      return;
    }

    const [bearer, token] = credentials;
    const signature = getSignature(bearer);
    if (!signature) {
      res.status(401).json({ message: "Invalid token" });
      return;
    }

    let payload: TokenPayload;
    try {
      payload = verifyToken(token, signature, "access");
    } catch {
      res.status(401).json({ message: "Invalid or expired token" });
      return;
    }

    try {
      const attached = await attachVerifiedUser(req, payload, bearer, loadUser);
      if (!attached) {
        res.status(401).json({ message: "Invalid or expired token" });
        return;
      }
    } catch (error) {
      next(error);
      return;
    }

    next();
  };

/** Optional auth — attaches the user when a valid access token is present but never rejects. */
export const softAuth = createSoftAuthMiddleware(loadActiveUser);

/** Verifies the JWT from the Authorization header and attaches the user. */
export const auth = createAuthMiddleware(loadActiveUser);

/** Creates a short-lived JWT access token. */
export const generateAccessToken = (userSearch: UserSearch): string | undefined => {
  const role = userSearch.role || "user";
  const signature = getSignature(role);
  if (!signature) {
    return undefined;
  }
  return jwt.sign({ _id: userSearch._id, role, type: "access" }, signature, {
    expiresIn: env.accessToken as jwt.SignOptions["expiresIn"],
  });
};

/** Creates a long-lived JWT refresh token. */
export const generateRefreshToken = (userSearch: UserSearch): string | undefined => {
  const role = userSearch.role || "user";
  const signature = getSignature(role);
  if (!signature) {
    return undefined;
  }
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
  if (!env.verifySignature) {
    return undefined;
  }
  return jwt.sign({ _id: userId, type }, env.verifySignature, {
    expiresIn: expiresIn as jwt.SignOptions["expiresIn"],
  });
};
