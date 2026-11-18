/**
 * Paymob adapter placeholder (MVP-12).
 *
 * Why this is a stub: creating an intention/session, the authoritative status
 * inquiry, and the HMAC field list all depend on Paymob endpoint and credential
 * confirmation (MVP-03). Those confirmations are still missing, so this adapter
 * deliberately refuses with an explicit `503` instead of guessing URLs or
 * payloads. See docs/implementation/EXTERNAL_INTEGRATION_BLOCKERS.md.
 *
 * Configuration is validated per operation, never at boot: a COD-only
 * deployment does not need Paymob credentials, and a card attempt with missing
 * configuration still gets a safe `503` instead of a startup failure.
 */
import { HttpError } from "../../common/utils/httpError.js";

import {
  CreateSessionInput,
  CreateSessionResult,
  FetchStatusResult,
  PaymentProvider,
  VerifiedPaymentEvent,
} from "./payment.types.js";
import { getPaymobConfig, PaymobConfigError } from "./paymob.config.js";

export const PAYMOB_UNAVAILABLE_MESSAGE =
  "Paymob payments are not available yet. Session creation, status inquiry, and " +
  "webhook verification are blocked on confirmed Paymob endpoints and credentials " +
  "(MVP-13/MVP-15). No payment was taken.";

const unavailable = (): never => {
  throw new HttpError(503, PAYMOB_UNAVAILABLE_MESSAGE);
};

/**
 * Turns a configuration error into the same safe 503 used by the stub. The
 * message lists missing variable names only; no value is echoed.
 */
const assertPaymobConfigured = (): void => {
  try {
    getPaymobConfig();
  } catch (error) {
    if (error instanceof PaymobConfigError) {
      throw new HttpError(503, `${error.message} No payment was taken.`);
    }
    throw error;
  }
};

export const paymobPaymentProvider: PaymentProvider = {
  name: "paymob",

  async createSession(_input: CreateSessionInput): Promise<CreateSessionResult> {
    assertPaymobConfigured();
    return unavailable();
  },

  async verifyAndParse(): Promise<VerifiedPaymentEvent> {
    assertPaymobConfigured();
    return unavailable();
  },

  async fetchStatus(_providerReference: string): Promise<FetchStatusResult> {
    assertPaymobConfigured();
    return unavailable();
  },
};
