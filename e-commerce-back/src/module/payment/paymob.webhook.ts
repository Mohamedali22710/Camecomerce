/** Paymob transaction webhook (MVP-16).
 *
 * This router MUST be mounted before the JSON body parser: the signature is
 * computed over the exact received bytes, so a parsed object cannot be used.
 *
 * Responses:
 * - 200 for an accepted, duplicate, unknown-order, or business-rejected event
 *   (a business rejection must not make Paymob retry forever);
 * - 400 for an unreadable body;
 * - 401 for a missing or invalid HMAC (nothing is written);
 * - 5xx only when local persistence failed, so Paymob retries.
 */
import express, { Request, Response, Router } from "express";

import { env } from "../../../config/env.service.js";
import { HttpError } from "../../common/utils/httpError.js";

import { getPaymentProvider } from "./payment.registry.js";
import { settlePaymentEvent } from "./payment.settlement.js";

export const handlePaymobWebhook = async (req: Request, res: Response): Promise<void> => {
  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from("");
  if (rawBody.length === 0) {
    throw new HttpError(400, "Missing Paymob callback body");
  }

  // Provider selection is explicit here: this route only accepts Paymob.
  const provider = getPaymentProvider("paymob");
  const event = await provider.verifyAndParse(
    rawBody,
    req.headers as Record<string, string | string[] | undefined>,
    req.query as Record<string, unknown>,
  );

  const outcome = await settlePaymentEvent(event);

  res.status(200).json({
    received: true,
    result: outcome.result,
    changed: outcome.changed,
  });
};

export const paymobWebhookRouter = Router();

paymobWebhookRouter.post(
  "/",
  express.raw({ type: "application/json", limit: env.jsonBodyLimit }),
  handlePaymobWebhook,
);
