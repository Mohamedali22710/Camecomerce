/** Express app setup: middleware, routes, and global error handler. */
import { v2 as cloudinary } from "cloudinary";
import compression from "compression";
import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import helmet from "helmet";
import passport from "passport";

import { env } from "../config/env.service.js";

import { rejectMongoOperators } from "./common/middleware/sanitize.js";
import { HttpError } from "./common/utils/httpError.js";
import authRouter from "./module/auth/auth.controller.js";
import { initPassport } from "./module/auth/passport.config.js";
import bundleRouter from "./module/bundle/bundle.controller.js";
import cartRouter from "./module/cart/cart.controller.js";
import categoryRouter from "./module/category/category.controller.js";
import contactRouter from "./module/contact/contact.controller.js";
import installationRouter from "./module/installation/installation.controller.js";
import orderRouter from "./module/order/order.controller.js";
import paymentRouter from "./module/payment/payment.controller.js";
import { paymobWebhookRouter } from "./module/payment/paymob.webhook.js";
import productRouter from "./module/product/product.controller.js";
import securityRouter from "./module/security/security.controller.js";
import subcategoryRouter from "./module/subcategory/subcategory.controller.js";
import userRouter from "./module/user/user.controller.js";
import wishlistRouter from "./module/wishlist/wishlist.controller.js";

const app = express();

app.disable("x-powered-by");
// Required for correct client IPs (and rate limiting) behind a reverse proxy.
app.set("trust proxy", env.trustProxy ? 1 : false);

/**
 * CORS is allow-list based. Without `CORS_ORIGINS`, development reflects the
 * request origin while production denies cross-origin requests entirely.
 */
const corsOrigin: cors.CorsOptions["origin"] =
  env.corsOrigins.length > 0
    ? (origin, callback) => {
        if (!origin || env.corsOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(new HttpError(403, "Origin is not allowed by CORS"));
      }
    : env.isProduction
      ? false
      : true;

app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  }),
);

app.use(helmet());
app.use(compression());

// Paymob signs the exact received bytes, so this router must be mounted before
// the JSON body parser. No other route receives a raw buffer.
app.use("/v1/payment/paymob/webhook", paymobWebhookRouter);

app.use((req, res, next) => {
  const contentType = req.headers["content-type"] || "";
  if (contentType.includes("multipart/form-data")) {
    next();
    return;
  }
  express.json({ limit: env.jsonBodyLimit })(req, res, next);
});

app.use(express.urlencoded({ extended: false, limit: env.jsonBodyLimit }));
app.use("/uploads", express.static("uploads"));

// Reject MongoDB operator keys (`$ne`, dotted paths, ...) everywhere.
app.use(rejectMongoOperators);

if (env.CLOUDINARY_NAME && env.CLOUDINARY_KEY && env.CLOUDINARY_SECRET) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_NAME,
    api_key: env.CLOUDINARY_KEY,
    api_secret: env.CLOUDINARY_SECRET,
  });
}

initPassport();
app.use(passport.initialize());

app.get("/v1/health", (_req, res) => {
  res.status(200).json({ status: "ok", currency: env.CURRENCY });
});

app.use("/v1/auth", authRouter);
app.use("/v1/user", userRouter);
app.use("/v1/category", categoryRouter);
app.use("/v1/subcategory", subcategoryRouter);
app.use("/v1/wishlist", wishlistRouter);
app.use("/v1/cart", cartRouter);
app.use("/v1/products", productRouter);
app.use("/v1/bundles", bundleRouter);
app.use("/v1/order", orderRouter);
app.use("/v1/payment", paymentRouter);
app.use("/v1/installation", installationRouter);
app.use("/v1/security", securityRouter);
app.use("/v1/contact", contactRouter);

app.use((req: Request, res: Response) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
});

interface ErrorWithDetails extends Error {
  status?: number;
  code?: number | string;
  type?: string;
  name: string;
  path?: string;
  keyValue?: Record<string, unknown>;
  errors?: Record<string, { message?: string }>;
}

/**
 * Centralized error handler. Known error shapes are mapped to a status and a
 * safe message; internal details are hidden in production.
 */
app.use((err: ErrorWithDetails, req: Request, res: Response, _next: NextFunction) => {
  let status = err.status && err.status >= 400 ? err.status : 500;
  let message = "Internal Server Error";
  let errors: Record<string, unknown> | undefined;

  if (err instanceof HttpError) {
    status = err.status;
    message = err.message;
  } else if (err.name === "ValidationError") {
    status = 400;
    message = "Validation failed";
    errors = Object.fromEntries(Object.entries(err.errors ?? {}).map(([field, detail]) => [field, detail?.message]));
  } else if (err.name === "CastError") {
    status = 400;
    message = `Invalid value${err.path ? ` for ${err.path}` : ""}`;
  } else if (err.code === 11000) {
    status = 409;
    message = "A record with these values already exists";
    errors = err.keyValue;
  } else if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    status = 401;
    message = "Invalid or expired token";
  } else if (err.type === "entity.parse.failed") {
    status = 400;
    message = "Invalid JSON body";
  } else if (err.type === "entity.too.large") {
    status = 413;
    message = "Request body is too large";
  } else if (err.message) {
    message = env.isProduction ? "Internal Server Error" : err.message;
  }

  if (status >= 500) {
    console.error(`[${req.method} ${req.originalUrl}]`, err.name, err.message, env.isProduction ? "" : err.stack);
  }

  res.status(status).json({ message, ...(errors ? { errors } : {}) });
});

export default app;
