/** Loads and validates environment variables from `config/.env` (or the process environment). */
import dotenv from "dotenv";

dotenv.config({ path: "./config/.env" });

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

  MONGODB_URI: string;
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

  paymentProvider: string;
  Secret_key_Stripe: string | undefined;
  STRIPE_WEBHOOK_SECRET: string | undefined;
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

  MONGODB_URI: process.env.MONGODB_URI || "mongodb://localhost:27017/cctv-ecommerce",
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

  paymentProvider: (process.env.PAYMENT_PROVIDER || "stripe").toLowerCase(),
  Secret_key_Stripe: process.env.Secret_key_Stripe,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
};

/**
 * Fails fast when security-critical configuration is missing.
 * Optional integrations (Redis, Cloudinary, Google, Stripe, SMTP) degrade gracefully.
 */
export const assertEnv = (): void => {
  const missing: string[] = [];
  if (!env.signatureAdmin) missing.push("SIGNATURE_ADMIN");
  if (!env.signatureUser) missing.push("SIGNATURE_USER");
  if (!env.SIGNATURE_SUPER_ADMIN) missing.push("SIGNATURE_SUPER_ADMIN");
  if (!env.verifySignature) missing.push("VERIFY_SIGNATURE_MY");

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}. See config/.env.example.`,
    );
  }
};
