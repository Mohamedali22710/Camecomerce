/** Auth business logic: user creation, token generation, email verification, password reset. */
import bcrypt from "bcryptjs";
import { Request, Response } from "express";
import jwt from "jsonwebtoken";

import { env } from "../../../config/env.service.js";
import { sendEmail } from "../../common/email/sendEmail.js";
import {
  generateAccessToken,
  generatePurposeToken,
  generateRefreshToken,
  getSignature,
  isRole,
  verifyToken,
} from "../../common/middleware/auth.js";
import { HttpError } from "../../common/utils/httpError.js";
import { userModel, UserRole } from "../../database/model/user.model.js";
import { getClient } from "../../database/redis.connection.js";

interface GoogleUser {
  _id: string;
  role: string;
}

interface TokenPayload extends jwt.JwtPayload {
  _id?: string;
  role?: string;
  type?: string;
}

const normalizeEmail = (value: unknown): string =>
  String(value ?? "")
    .trim()
    .toLowerCase();

const hashRounds = (): number => {
  const parsed = Number(env.hash);
  return Number.isInteger(parsed) && parsed >= 8 && parsed <= 15 ? parsed : 10;
};

const buildVerifyLink = (token: string): string =>
  `${env.base_url}/v1/auth/verify-email/${encodeURIComponent(token)}`;

const buildResetLink = (token: string): string =>
  `${env.base_url}/v1/auth/reset-password/${encodeURIComponent(token)}`;

/** Sends a verification email and reports whether SMTP delivery succeeded. */
const trySendVerificationEmail = async (email: string, userId: string): Promise<boolean> => {
  const token = generatePurposeToken(userId, "verify", "1h");
  if (!token) {return false;}

  const verifyLink = buildVerifyLink(token);
  try {
    await sendEmail({
      email,
      subject: "Verify your email",
      text: `Click this link to verify your email: ${verifyLink}`,
      html: `<p>Click <a href="${verifyLink}">here</a> to verify your email.</p>`,
    });
    return true;
  } catch (error: any) {
    console.error("Verification email failed:", error?.message);
    return false;
  }
};

const issueSession = (user: { _id: unknown; role: string }) => {
  const accessToken = generateAccessToken({ _id: String(user._id), role: user.role });
  const refreshToken = generateRefreshToken({ _id: String(user._id), role: user.role });
  if (!accessToken || !refreshToken) {
    throw new HttpError(500, "Token generation failed");
  }
  return { accessToken, refreshToken };
};

/** Google OAuth signup callback. */
export const googleSignupHandler = async (req: Request, res: Response): Promise<void> => {
  const googleUser = req.user as GoogleUser | undefined;
  if (!googleUser?._id) {throw new HttpError(400, "Google signup failed");}

  const user = await userModel.findById(googleUser._id);
  if (!user) {throw new HttpError(400, "Google signup failed");}

  const tokens = issueSession(user);
  res.status(200).json({
    message: "Google signup successful",
    data: {
      ...tokens,
      user: { _id: user._id, role: user.role, name: user.name, email: user.email },
    },
  });
};

/** Google OAuth login callback. Tokens are placed in the URL fragment, so they
 * are never sent to (or logged by) the server. */
export const googleLoginHandler = async (req: Request, res: Response): Promise<void> => {
  const googleUser = req.user as GoogleUser | undefined;
  if (!googleUser?._id) {throw new HttpError(400, "Google login failed");}

  const user = await userModel.findById(googleUser._id);
  if (!user) {throw new HttpError(401, "Google login failed");}
  if (user.isBlocked) {throw new HttpError(403, "This account has been blocked");}

  const { accessToken, refreshToken } = issueSession(user);
  const params = new URLSearchParams({
    accessToken,
    refreshToken,
    role: user.role,
  });

  res.redirect(`${env.frontendUrl}/auth/callback#${params.toString()}`);
};

/** Registers a new email/password user. Only a super admin may create staff accounts. */
export const signupHandler = async (req: Request, res: Response): Promise<void> => {
  const email = normalizeEmail(req.body.email);
  const { password, confirmPassword } = req.body;
  const targetRole: UserRole = (req.body.role as UserRole) || "user";

  if (password !== confirmPassword) {
    throw new HttpError(400, "Passwords do not match");
  }

  if (targetRole === "admin" || targetRole === "superAdmin") {
    if (req.user?.role !== "superAdmin") {
      throw new HttpError(403, "Only super admins can create admin accounts");
    }
  }

  const existingUser = await userModel.findOne({ email });
  if (existingUser) {
    throw new HttpError(409, "Email already exists");
  }

  const phone = req.body.phone ? String(req.body.phone).trim() : null;
  if (phone) {
    const existingPhone = await userModel.findOne({ phone });
    if (existingPhone) {
      throw new HttpError(409, "Phone number already in use");
    }
  }

  const hashedPassword = await bcrypt.hash(password, hashRounds());
  const isPrivileged = targetRole === "admin" || targetRole === "superAdmin";

  // NOTE: Email verification is temporarily disabled per requirements.
  // All accounts (public and staff) are created active (isActive: true)
  // so users can register and log in immediately without email verification.
  // The email verification sending code and endpoints are preserved for future re-enabling.
  const user = await userModel.create({
    name: email.split("@")[0] || email,
    email,
    password: hashedPassword,
    role: targetRole,
    isActive: true, // Temporarily active immediately (was: isPrivileged)
    phone,
  });

  // Temporarily disabled: sending verification email
  // const emailSent = isPrivileged
  //   ? false
  //   : await trySendVerificationEmail(user.email, String(user._id));

  res.status(201).json({
    message: isPrivileged
      ? "Staff account created"
      : "Signup successful",
    data: { email: user.email },
  });
};

/** Email/password login. */
export const loginHandler = async (req: Request, res: Response): Promise<void> => {
  const email = normalizeEmail(req.body.email);
  const { password } = req.body;

  const user = await userModel.findOne({ email }).select("+password");
  if (!user || !user.password) {
    // Same message for "unknown email", "Google-only account", and "wrong
    // password" to avoid account enumeration.
    throw new HttpError(401, "Invalid email or password");
  }

  if (user.isBlocked) {
    throw new HttpError(403, "This account has been blocked");
  }

  // NOTE: Email verification is temporarily disabled per requirements.
  // Preserved for future re-enabling:
  // if (!user.isActive) {
  //   throw new HttpError(403, "Please verify your email first");
  // }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new HttpError(401, "Invalid email or password");
  }

  const tokens = issueSession(user);
  res.status(200).json({
    message: "Login successful",
    data: {
      ...tokens,
      role: user.role,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        imageURL: user.imageURL,
      },
    },
  });
};

/** Verifies an email address from the signed link. */
export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
  const token = req.params.token as string;

  let decoded: TokenPayload;
  try {
    decoded = verifyToken(token, env.verifySignature!, "verify");
  } catch {
    throw new HttpError(400, "Invalid or expired token");
  }

  const user = await userModel.findById(decoded._id);
  if (!user) {throw new HttpError(400, "Invalid token");}

  if (user.isActive) {
    res.status(200).json({ message: "Email already verified" });
    return;
  }

  if (user.isBlocked) {throw new HttpError(403, "This account has been blocked");}

  user.isActive = true;
  await user.save();
  res.status(200).json({ message: "Email verified successfully" });
};

/** Resends a verification email. The response never reveals whether the account exists. */
export const resendVerifyEmail = async (req: Request, res: Response): Promise<void> => {
  const email = normalizeEmail(req.body.email);
  const genericMessage = "If the account exists and is unverified, a verification email has been sent";

  const user = await userModel.findOne({ email });
  if (user && !user.isActive && !user.isBlocked) {
    await trySendVerificationEmail(user.email, String(user._id));
  }

  res.status(200).json({ message: genericMessage });
};

/** Starts the password-reset flow. Reset tokens are single-use and require Redis. */
export const forgotPasswordHandler = async (req: Request, res: Response): Promise<void> => {
  const redis = await getClient().catch(() => null);
  if (!redis) {
    // Fail closed: without Redis we cannot guarantee a single-use token.
    throw new HttpError(503, "Password reset is temporarily unavailable");
  }

  const email = normalizeEmail(req.body.email);
  const user = await userModel.findOne({ email });

  // Always return the same response to avoid account enumeration.
  const genericMessage = "If the email exists, a reset link has been sent";
  if (!user || user.isBlocked) {
    res.status(200).json({ message: genericMessage });
    return;
  }

  const resetToken = generatePurposeToken(String(user._id), "reset", "15m");
  if (!resetToken) {throw new HttpError(500, "Unable to create reset token");}

  try {
    await redis.set(`reset:${resetToken}`, String(user._id), { EX: 900 });
    const resetLink = buildResetLink(resetToken);
    await sendEmail({
      email: user.email,
      subject: "Reset your password",
      text: `Click this link to reset your password: ${resetLink}`,
      html: `<p>Click <a href="${resetLink}">here</a> to reset your password.</p>`,
    });
  } catch (error: any) {
    console.error("Password reset email failed:", error?.message);
    // The stored token is invalidated so it can never be used without delivery.
    await redis.del(`reset:${resetToken}`).catch(() => undefined);
  }

  res.status(200).json({ message: genericMessage });
};

/** Completes the password-reset flow with a single-use token. */
export const resetPasswordHandler = async (req: Request, res: Response): Promise<void> => {
  const token = req.params.token as string;
  const { password, confirmPassword } = req.body;

  if (password !== confirmPassword) {
    throw new HttpError(400, "Passwords do not match");
  }

  let decoded: TokenPayload;
  try {
    decoded = verifyToken(token, env.verifySignature!, "reset");
  } catch {
    throw new HttpError(400, "Invalid or expired token");
  }

  const redis = await getClient().catch(() => null);
  if (!redis) {throw new HttpError(503, "Password reset is temporarily unavailable");}

  const storedUserId = await redis.get(`reset:${token}`);
  if (!storedUserId || String(storedUserId) !== String(decoded._id)) {
    throw new HttpError(400, "Invalid or expired token");
  }

  const user = await userModel.findById(decoded._id);
  if (!user) {throw new HttpError(400, "User not found");}
  if (user.isBlocked) {throw new HttpError(403, "This account has been blocked");}

  user.password = await bcrypt.hash(password, hashRounds());
  await user.save();
  await redis.del(`reset:${token}`);

  res.status(200).json({ message: "Password reset successful" });
};

/** Exchanges a valid refresh token for a new access token. */
export const refreshAccessToken = async (req: Request, res: Response): Promise<void> => {
  const { authorization } = req.headers;
  if (!authorization) {throw new HttpError(401, "Login required");}

  const parts = authorization.split(" ");
  const token = parts.length === 1 ? parts[0] : parts[1];
  if (!token) {throw new HttpError(401, "Invalid token format");}

  const raw = jwt.decode(token) as TokenPayload | null;
  if (!raw || !isRole(raw.role)) {
    throw new HttpError(401, "Invalid or expired refresh token");
  }

  const signature = getSignature(raw.role);
  if (!signature) {throw new HttpError(401, "Invalid or expired refresh token");}

  let payload: TokenPayload;
  try {
    payload = verifyToken(token, `${signature}_refresh`, "refresh");
  } catch {
    throw new HttpError(401, "Invalid or expired refresh token");
  }

  const user = await userModel.findById(payload._id);
  if (!user) {throw new HttpError(401, "User not found");}
  if (user.isBlocked) {throw new HttpError(403, "This account has been blocked");}

  const accessToken = generateAccessToken({ _id: String(user._id), role: user.role });
  if (!accessToken) {throw new HttpError(500, "Token generation failed");}

  res.status(200).json({
    message: "Access token refreshed successfully",
    data: { accessToken },
  });
};
