/** Payment integration (temporary Stripe adapter).
 *
 * The order model stores only provider references — never card data. A Saudi
 * provider (Moyasar / Tap) can replace this file as long as it keeps the same
 * "create checkout" + "verified webhook updates payment status only" contract.
 */
import Stripe from "stripe";

import { env } from "../../../config/env.service.js";
import { toMinorUnits } from "../../common/utils/money.js";
import { orderModel } from "../../database/model/order.model.js";

interface PaymentItem {
  en_name: string;
  quantity: number;
  price: number;
}

const isConfigured = (): boolean => Boolean(env.Secret_key_Stripe);

/** Minimal fields used to decide whether a provider session really paid an order. */
export interface StripeSettlementFields {
  payment_status?: string | null;
  amount_total?: number | null;
  currency?: string | null;
}

export interface OrderSettlementFields {
  paymentMethod: string;
  totalAmount: number;
}

/**
 * True only when the provider says the session is paid, the provider amount
 * matches the stored order total in minor units, the currency matches, and the
 * order is actually a card order. Used by the webhook so a stray or tampered
 * event can never mark an order paid.
 */
export const isStripePaymentSettledForOrder = (
  session: StripeSettlementFields,
  order: OrderSettlementFields,
): boolean => {
  if (order.paymentMethod !== "card") {
    return false;
  }
  if (session.payment_status !== "paid") {
    return false;
  }
  if (session.amount_total !== toMinorUnits(order.totalAmount)) {
    return false;
  }
  if (session.currency && session.currency.toLowerCase() !== env.CURRENCY.toLowerCase()) {
    return false;
  }
  return true;
};

let client: Stripe | null = null;

const getStripe = (): Stripe | null => {
  if (!isConfigured()) {
    return null;
  }
  // Lazy initialization prevents a startup crash when Stripe is not configured.
  client ??= new Stripe(env.Secret_key_Stripe!);
  return client;
};

/** Creates a hosted checkout session. Returns null when Stripe is unavailable. */
export const createCheckoutSession = async (
  orderId: string,
  totalAmount: number,
  items: PaymentItem[],
  shippingCost = 0,
): Promise<Stripe.Checkout.Session | null> => {
  const stripe = getStripe();
  if (!stripe) {
    console.warn("Stripe is not configured; card checkout cannot be started");
    return null;
  }

  const currency = env.CURRENCY.toLowerCase();

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map((item) => ({
    price_data: {
      currency,
      product_data: { name: item.en_name },
      unit_amount: Math.round(item.price * 100),
    },
    quantity: item.quantity,
  }));

  if (shippingCost > 0) {
    lineItems.push({
      price_data: {
        currency,
        product_data: { name: "Shipping" },
        unit_amount: Math.round(shippingCost * 100),
      },
      quantity: 1,
    });
  }

  try {
    return await stripe.checkout.sessions.create({
      line_items: lineItems,
      mode: "payment",
      metadata: { orderId: String(orderId) },
      client_reference_id: String(orderId),
      success_url: `${env.frontendUrl}/checkout/success?orderId=${encodeURIComponent(orderId)}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.frontendUrl}/checkout/cancel?orderId=${encodeURIComponent(orderId)}`,
    });
  } catch (error: any) {
    console.error("Stripe session error:", error?.message);
    return null;
  }
};

/**
 * Verifies and applies a webhook. Only payment fields are touched: order,
 * shipping, and installation statuses are handled by their own workflows.
 */
export const handleWebhook = async (
  body: Buffer,
  signature: string,
): Promise<{ received: boolean; error?: string }> => {
  const stripe = getStripe();
  if (!stripe || !env.STRIPE_WEBHOOK_SECRET) {
    return { received: false, error: "Stripe webhook is not configured" };
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (error: any) {
    return { received: false, error: error.message };
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.orderId;

        if (orderId) {
          const order = await orderModel.findById(orderId);

          // Never mark an order paid from an event alone: the stored order must
          // be a card order and the provider-reported state, amount, and
          // currency must all match what was stored server-side.
          const expectedAmountMinor = order ? toMinorUnits(order.totalAmount) : null;
          const amountMatches = expectedAmountMinor !== null && session.amount_total === expectedAmountMinor;
          const currencyMatches = !session.currency || session.currency.toLowerCase() === env.CURRENCY.toLowerCase();
          const providerSaysPaid = session.payment_status === "paid";

          if (!order || order.paymentMethod !== "card") {
            console.warn("Stripe webhook ignored: order is missing or not a card order", {
              orderId,
            });
            break;
          }

          if (!isStripePaymentSettledForOrder(session, order)) {
            console.warn("Stripe webhook ignored: payment state/amount/currency mismatch", {
              orderId,
              providerSaysPaid,
              amountMatches,
              currencyMatches,
            });
            break;
          }

          const reference = typeof session.payment_intent === "string" ? session.payment_intent : session.id;

          // Do not overwrite a payment that already succeeded.
          await orderModel.findOneAndUpdate(
            { _id: orderId, paymentStatus: { $ne: "paid" } },
            {
              paymentStatus: "paid",
              paymentProvider: "stripe",
              paymentReference: reference,
            },
          );
        }
        break;
      }

      case "checkout.session.async_payment_failed":
      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.orderId;
        if (orderId) {
          // Never downgrade a payment that already succeeded.
          await orderModel.findOneAndUpdate(
            { _id: orderId, paymentStatus: { $ne: "paid" } },
            { paymentStatus: "failed" },
          );
        }
        break;
      }

      default:
        break;
    }

    return { received: true };
  } catch (error: any) {
    console.error("Webhook processing error:", error?.message);
    return { received: false, error: "Webhook processing failed" };
  }
};
