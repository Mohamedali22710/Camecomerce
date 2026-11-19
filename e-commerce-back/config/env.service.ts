/** Loads and validates environment variables from `config/.env` (or the process environment). */
import path from "node:path";

import dotenv from "dotenv";

import { resolveEnvFilePath } from "../src/common/utils/envPath.js";

// Resolve the file from the code location instead of the process CWD, so
// `npm start`, `npm run dev`, tests, and tooling all read the same file.
// ts-jest/CommonJS provides `__dirname`; ESM runs fall back to the entry point.
const moduleDir =
  typeof __dirname === "string"
    ? __dirname
    : process.argv[1]
      ? path.dirname(path.resolve(process.argv[1]))
      : process.cwd();
const envFilePath = resolveEnvFilePath(moduleDir);
if (envFilePath) {
  dotenv.config({ path: envFilePath });
}

const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, "");

const nodeEnv = process.env.NODE_ENV || "development";
const port = process.env.PORT || "3007";
const base_url = trimTrailingSlash(process.env.BASE_URL || `http://localhost:${port}`);
const frontendUrl = trimTrailingSlash(process.env.FRONTEND_URL || "http://localhost:3000");
const corsOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

/** Shape of the application configuration. */
interface Env {
  nodeEnv: string;
  isProduction: boolean;
  port: string;
  base_url: string;
  frontendUrl: string;
  corsOrigins: string[];
  trustProxy: boolean;
  jsonBodyLimit: string;
  contactRecipientEmail: string | undefined;

  email: string | undefined;
  password: string | undefined;
  emailFromName: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  hash: string;

  signatureAdmin: string | undefined;
  signatureUser: string | undefined;
  SIGNATURE_SUPER_ADMIN: string | undefined;
  verifySignature: string | undefined;
  accessToken: string;
  refreshToken: string;

  MONGODB_URI: string | undefined;
  REDIS_URL: string | undefined;

  GOOGLE_CLIENT_ID: string | undefined;
  GOOGLE_CLIENT_SECRET: string | undefined;

  CLOUDINARY_NAME: string | undefined;
  CLOUDINARY_KEY: string | undefined;
  CLOUDINARY_SECRET: string | undefined;
  Image_TYPE: string;
  SERVER: string;

  CURRENCY: string;
  SHIPPING_COST_TYPE: string;
  SHIPPING_COST_VALUE: string;

  /** Undefined when PAYMENT_PROVIDER is absent; never defaulted implicitly. */
  paymentProvider: string | undefined;

  /** Paymob configuration. Optional so COD-only deployments still boot. */
  /** Region is explicit and must never be inferred from a URL or a key. */
  PAYMOB_REGION: string | undefined;
  PAYMOB_ENV: "sandbox" | "live";
  PAYMOB_API_KEY: string | undefined;
  PAYMOB_SECRET_KEY: string | undefined;
  PAYMOB_PUBLIC_KEY: string | undefined;
  PAYMOB_HMAC_SECRET: string | undefined;
  PAYMOB_BASE_URL: string | undefined;
  PAYMOB_CHECKOUT_URL: string | undefined;
  PAYMOB_INTEGRATION_ID_CARD: string | undefined;
  PAYMOB_INTEGRATION_ID_MADA: string | undefined;
  PAYMOB_INTEGRATION_ID_APPLE_PAY: string | undefined;
  PAYMOB_INTEGRATION_ID_TABBY: string | undefined;
  PAYMOB_INTEGRATION_ID_TAMARA: string | undefined;
  /** Explicit merchant-confirmed list; absent means card-only. */
  PAYMOB_METHODS_ENABLED: string | undefined;
  /** How long a card order may stay payable before expiry handling. */
  PAYMENT_ORDER_TTL_MINUTES: number;
}

/** Aggregated, typed application configuration. */
export const env: Env = {
  nodeEnv,
  isProduction: nodeEnv === "production",
  port,
  base_url,
  frontendUrl,
  corsOrigins,
  trustProxy: process.env.TRUST_PROXY === "true" || process.env.TRUST_PROXY === "1",
  jsonBodyLimit: process.env.JSON_BODY_LIMIT || "5mb",
  contactRecipientEmail: process.env.CONTACT_RECIPIENT_EMAIL || process.env.EMAIL,

  email: process.env.EMAIL,
  password: process.env.PASSWORD,
  emailFromName: process.env.EMAIL_FROM_NAME || "CCTV Store",
  smtpHost: process.env.SMTP_HOST || "smtp.gmail.com",
  smtpPort: Number(process.env.SMTP_PORT) || 587,
  smtpSecure: process.env.SMTP_SECURE === "true",
  hash: process.env.HASH || "10",

  signatureAdmin: process.env.SIGNATURE_ADMIN,
  signatureUser: process.env.SIGNATURE_USER,
  SIGNATURE_SUPER_ADMIN: process.env.SIGNATURE_SUPER_ADMIN,
  verifySignature: process.env.VERIFY_SIGNATURE_MY,
  accessToken: process.env.ACCESS_TOKEN || "30m",
  refreshToken: process.env.REFRESH_TOKEN || "30d",

  MONGODB_URI: process.env.MONGODB_URI,
  REDIS_URL: process.env.REDIS_URL,

  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,

  CLOUDINARY_NAME: process.env.CLOUDINARY_NAME,
  CLOUDINARY_KEY: process.env.CLOUDINARY_KEY,
  CLOUDINARY_SECRET: process.env.CLOUDINARY_SECRET,
  Image_TYPE: (process.env.Image_TYPE || "CLOUDINARY").toUpperCase(),
  SERVER: process.env.SERVER || "",

  CURRENCY: (process.env.CURRENCY || "SAR").toUpperCase(),
  SHIPPING_COST_TYPE: process.env.SHIPPING_COST_TYPE || "fixed",
  SHIPPING_COST_VALUE: process.env.SHIPPING_COST_VALUE || "0",

  // Provider selection is explicit. No implicit default: a missing value keeps
  // card checkout disabled (COD still works) and fails boot in production.
  paymentProvider: process.env.PAYMENT_PROVIDER?.trim().toLowerCase() || undefined,

  PAYMOB_REGION: process.env.PAYMOB_REGION?.trim().toLowerCase() || undefined,
  PAYMOB_ENV: process.env.PAYMOB_ENV === "live" ? "live" : "sandbox",
  PAYMOB_API_KEY: process.env.PAYMOB_API_KEY || undefined,
  PAYMOB_SECRET_KEY: process.env.PAYMOB_SECRET_KEY || undefined,
  PAYMOB_PUBLIC_KEY: process.env.PAYMOB_PUBLIC_KEY || undefined,
  PAYMOB_HMAC_SECRET: process.env.PAYMOB_HMAC_SECRET || undefined,
  PAYMOB_BASE_URL: process.env.PAYMOB_BASE_URL || undefined,
  PAYMOB_CHECKOUT_URL: process.env.PAYMOB_CHECKOUT_URL || undefined,
  PAYMOB_INTEGRATION_ID_CARD: process.env.PAYMOB_INTEGRATION_ID_CARD || undefined,
  PAYMOB_INTEGRATION_ID_MADA: process.env.PAYMOB_INTEGRATION_ID_MADA || undefined,
  PAYMOB_INTEGRATION_ID_APPLE_PAY: process.env.PAYMOB_INTEGRATION_ID_APPLE_PAY || undefined,
  PAYMOB_INTEGRATION_ID_TABBY: process.env.PAYMOB_INTEGRATION_ID_TABBY || undefined,
  PAYMOB_INTEGRATION_ID_TAMARA: process.env.PAYMOB_INTEGRATION_ID_TAMARA || undefined,
  PAYMOB_METHODS_ENABLED: process.env.PAYMOB_METHODS_ENABLED || undefined,
  PAYMENT_ORDER_TTL_MINUTES: Number(process.env.PAYMENT_ORDER_TTL_MINUTES) || 30,
};

/**
 * Fails fast when security-critical configuration is missing.
 * Optional integrations (Redis, Cloudinary, Google, SMTP) degrade gracefully.
 */
const MIN_SECRET_LENGTH = 32;
const PLACEHOLDER_SECRET = /replace-with|change-?me|your-?secret|example|development-secret/i;

/** Returns the names of JWT secrets that are too short or still placeholders. */
const weakJwtSecrets = (): string[] => {
  const secrets: [string, string | undefined][] = [
    ["SIGNATURE_ADMIN", env.signatureAdmin],
    ["SIGNATURE_USER", env.signatureUser],
    ["SIGNATURE_SUPER_ADMIN", env.SIGNATURE_SUPER_ADMIN],
    ["VERIFY_SIGNATURE_MY", env.verifySignature],
  ];

  return secrets
    .filter(
      ([, value]) =>
        Boolean(value) && (String(value).length < MIN_SECRET_LENGTH || PLACEHOLDER_SECRET.test(String(value))),
    )
    .map(([name]) => name);
};

export const assertEnv = (): void => {
  const missing: string[] = [];
  if (!env.MONGODB_URI) missing.push("MONGODB_URI");
  if (!env.signatureAdmin) missing.push("SIGNATURE_ADMIN");
  if (!env.signatureUser) missing.push("SIGNATURE_USER");
  if (!env.SIGNATURE_SUPER_ADMIN) missing.push("SIGNATURE_SUPER_ADMIN");
  if (!env.verifySignature) missing.push("VERIFY_SIGNATURE_MY");

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}. See config/.env.example.`);
  }

  const weak = weakJwtSecrets();
  if (weak.length > 0) {
    throw new Error(
      `Insecure JWT signing secrets: ${weak.join(", ")}. ` +
        `Use at least ${MIN_SECRET_LENGTH} random characters; never commit real secrets.`,
    );
  }
};
