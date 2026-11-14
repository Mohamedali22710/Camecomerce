/** Rate-limiting middleware backed by express-rate-limit (in-memory store). */
import rateLimit from "express-rate-limit";

/**
 * @param windowSeconds - Length of the rate-limit window in seconds.
 * @param limit - Maximum number of requests allowed per IP in the window.
 */
export const rateLimiter = (windowSeconds: number, limit = 1) =>
  rateLimit({
    windowMs: windowSeconds * 1000,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      message: `Too many requests. Try again after ${windowSeconds}s`,
    },
  });
