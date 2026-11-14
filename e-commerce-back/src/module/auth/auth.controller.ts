/** Auth routes: email/password signup & login, Google OAuth, email verification, password reset. */
import { NextFunction, Request, Response, Router } from "express";
import passport from "passport";

import { softAuth } from "../../common/middleware/auth.js";
import { rateLimiter } from "../../common/utils/rateLimit.js";
import { validateInput } from "../../common/utils/validate.js";

import {
  forgotPasswordHandler,
  googleLoginHandler,
  googleSignupHandler,
  loginHandler,
  refreshAccessToken,
  resendVerifyEmail,
  resetPasswordHandler,
  signupHandler,
  verifyEmail,
} from "./auth.service.js";
import {
  emailOnlyValidate,
  loginValidate,
  resetPasswordValidate,
  signupValidate,
} from "./auth.validate.js";
import { clearOAuthState, issueOAuthState, verifyOAuthState } from "./oauthState.js";
import { initPassport, isGoogleConfigured } from "./passport.config.js";

// Registering the strategies is idempotent; doing it here keeps the router
// self-contained when it is mounted by the app.
initPassport();

const router = Router();

/** Returns 503 instead of a confusing Passport error when Google is unconfigured. */
const requireGoogleConfigured = (
  _req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (!isGoogleConfigured()) {
    res.status(503).json({ message: "Google OAuth is not configured" });
    return;
  }
  next();
};

const startOAuth = (strategy: string) => (req: Request, res: Response, next: NextFunction) => {
  const state = issueOAuthState(res);
  passport.authenticate(strategy, {
    scope: ["profile", "email"],
    session: false,
    state,
  })(req, res, next);
};

const finishOAuth = (strategy: string, failureMessage: string) => (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (!verifyOAuthState(req)) {
    clearOAuthState(res);
    res.status(400).json({ message: "Invalid OAuth state. Please try again." });
    return;
  }

  passport.authenticate(
    strategy,
    { session: false },
    (err: Error | null, user: unknown, info?: { message?: string }) => {
      clearOAuthState(res);
      if (err) {return next(err);}
      if (!user) {
        res.status(400).json({ message: info?.message || failureMessage });
        return;
      }
      req.user = user;
      next();
    },
  )(req, res, next);
};

/**
 * @route GET /v1/auth/google/signup
 * @desc Redirect to Google OAuth consent screen for signup
 * @access Public
 * @returns { 302 } Redirect to Google
 */
router.get("/google/signup", requireGoogleConfigured, startOAuth("google-signup"));

/**
 * @route GET /v1/auth/google/signup/callback
 * @desc Google OAuth signup callback — creates a regular user account
 * @access Public
 * @returns { 200 } { message, data: { accessToken, refreshToken, user } }
 */
router.get(
  "/google/signup/callback",
  requireGoogleConfigured,
  finishOAuth("google-signup", "Google signup failed"),
  googleSignupHandler,
);

/**
 * @route GET /v1/auth/google/login
 * @desc Redirect to Google OAuth consent screen for login
 * @access Public
 * @returns { 302 } Redirect to Google
 */
router.get("/google/login", requireGoogleConfigured, startOAuth("google-login"));

/**
 * @route GET /v1/auth/google/login/callback
 * @desc Google OAuth login callback — redirects to the frontend with tokens in
 *       the URL fragment (fragments are not sent to servers or logs)
 * @access Public
 * @returns { 302 } Redirect to `${FRONTEND_URL}/auth/callback#accessToken=...`
 */
router.get(
  "/google/login/callback",
  requireGoogleConfigured,
  finishOAuth("google-login", "Google login failed"),
  googleLoginHandler,
);

/**
 * @route POST /v1/auth/signup
 * @desc Register a new user with email and password
 * @access Public (staff roles require a super admin token)
 */
router.post(
  "/signup",
  rateLimiter(60, 5),
  softAuth,
  validateInput(signupValidate),
  signupHandler,
);

/**
 * @route POST /v1/auth/login
 * @desc Email/password login
 * @access Public
 */
router.post("/login", rateLimiter(60, 10), validateInput(loginValidate), loginHandler);

/**
 * @route GET /v1/auth/verify-email/:token
 * @desc Verify user email address using a signed token
 * @access Public
 */
router.get("/verify-email/:token", verifyEmail);

/**
 * @route POST /v1/auth/resend-verify-email
 * @desc Resend the verification email
 * @access Public
 */
router.post(
  "/resend-verify-email",
  rateLimiter(60, 3),
  validateInput(emailOnlyValidate),
  resendVerifyEmail,
);

/**
 * @route POST /v1/auth/forgot-password
 * @desc Send a single-use password reset link
 * @access Public
 */
router.post(
  "/forgot-password",
  rateLimiter(60, 3),
  validateInput(emailOnlyValidate),
  forgotPasswordHandler,
);

/**
 * @route POST /v1/auth/reset-password/:token
 * @desc Reset password using the single-use token from the email
 * @access Public
 */
router.post(
  "/reset-password/:token",
  rateLimiter(60, 5),
  validateInput(resetPasswordValidate),
  resetPasswordHandler,
);

/**
 * @route POST /v1/auth/access-token
 * @desc Exchange a refresh token (Authorization header) for a new access token
 * @access Public
 */
router.post("/access-token", rateLimiter(60, 20), refreshAccessToken);

export default router;
