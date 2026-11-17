/** Paymob adapter placeholder (MVP-12).
 *
 * Why this is a stub: creating an intention/session, the authoritative status
 * inquiry, and the HMAC field list all depend on Paymob endpoint and credential
 * confirmation (MVP-03). Those confirmations are still missing, so this adapter
 * deliberately refuses with an explicit `503` instead of guessing URLs or
 * payloads. See docs/implementation/EXTERNAL_INTEGRATION_BLOCKERS.md.
 *
 * `getPaymobConfig()` still runs first: selecting Paymob without configuration
 * must fail loudly rather than produce an `undefined` provider URL.
 */
import { HttpError } from "../../common/utils/httpError.js";

import {
  CreateSessionInput,
  CreateSessionResult,
  FetchStatusResult,
  PaymentProvider,
  VerifiedPaymentEvent,
} from "./payment.types.js";
import { getPaymobConfig } from "./paymob.config.js";

export const PAYMOB_UNAVAILABLE_MESSAGE =
  "Paymob payments are not available yet. Session creation, status inquiry, and " +
  "webhook verification are blocked on confirmed Paymob endpoints and credentials " +
  "(MVP-13/MVP-15). No payment was taken.";

const unavailable = (): never => {
  throw new HttpError(503, PAYMOB_UNAVAILABLE_MESSAGE);
};

export const paymobPaymentProvider: PaymentProvider = {
  name: "paymob",

  async createSession(_input: CreateSessionInput): Promise<CreateSessionResult> {
    getPaymobConfig();
    return unavailable();
  },

  async verifyAndParse(): Promise<VerifiedPaymentEvent> {
    getPaymobConfig();
    return unavailable();
  },

  async fetchStatus(_providerReference: string): Promise<FetchStatusResult> {
    getPaymobConfig();
    return unavailable();
  },
};
