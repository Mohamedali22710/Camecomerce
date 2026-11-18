/** Legacy Stripe adapter exposed through the provider registry.
 *
 * Stripe is NOT the Saudi payment provider. This adapter exists for two reasons:
 *
 * 1. `createOrder` must resolve exactly one adapter from `PAYMENT_PROVIDER`
 *    instead of importing Stripe directly, so selecting Paymob cannot silently
 *    create Stripe sessions.
 * 2. Rollback: with `PAYMENT_PROVIDER=stripe` the existing hosted checkout keeps
 *    working unchanged.
 *
 * Signature verification and status inquiry stay on the legacy
 * `/v1/order/webhook` route (`stripe.service.ts`); exposing a second,
 * half-implemented verification path here would duplicate security-critical code.
 */
import { HttpError } from "../../common/utils/httpError.js";
import { fromMinorUnits } from "../../common/utils/money.js";
import { createCheckoutSession } from "../order/stripe.service.js";

import {
  CreateSessionInput,
  CreateSessionResult,
  FetchStatusResult,
  PaymentProvider,
  VerifiedPaymentEvent,
} from "./payment.types.js";

const unsupported = (operation: string): HttpError =>
  new HttpError(
    501,
    `Stripe ${operation} is not exposed through the payment registry. ` +
      "Use the legacy /v1/order/webhook route and the Stripe dashboard.",
  );

/** Rebuilds the shipping line from the minor-unit total and the priced items. */
const shippingMinorUnits = (input: CreateSessionInput): number => {
  const itemsMinor = input.items.reduce((sum, item) => sum + item.unitAmountMinor * item.quantity, 0);
  return Math.max(0, input.amountMinor - itemsMinor);
};

export const stripePaymentProvider: PaymentProvider = {
  name: "stripe",

  async createSession(input: CreateSessionInput): Promise<CreateSessionResult> {
    const session = await createCheckoutSession(
      input.orderId,
      fromMinorUnits(input.amountMinor),
      input.items.map((item) => ({
        en_name: item.name,
        quantity: item.quantity,
        price: fromMinorUnits(item.unitAmountMinor),
      })),
      fromMinorUnits(shippingMinorUnits(input)),
    );

    if (!session) {
      throw new HttpError(
        503,
        "Stripe is not configured or the checkout session could not be created. " +
          "Set Secret_key_Stripe, or select another PAYMENT_PROVIDER.",
      );
    }

    if (!session.url) {
      throw new HttpError(502, "Stripe did not return a checkout URL");
    }

    return {
      provider: "stripe",
      providerReference: session.id,
      providerTransactionId: typeof session.payment_intent === "string" ? session.payment_intent : null,
      amountMinor: input.amountMinor,
      currency: input.currency,
      paymentStatus: "pending",
      redirectUrl: session.url,
      clientSecret: null,
    };
  },

  async verifyAndParse(): Promise<VerifiedPaymentEvent> {
    throw unsupported("webhook verification");
  },

  async fetchStatus(): Promise<FetchStatusResult> {
    throw unsupported("status inquiry");
  },
};
