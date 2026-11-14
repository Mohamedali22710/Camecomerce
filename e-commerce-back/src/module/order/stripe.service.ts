/** Payment integration (temporary Stripe adapter).
 *
 * The order model stores only provider references — never card data. A Saudi
 * provider (Moyasar / Tap) can replace this file as long as it keeps the same
 * "create checkout" + "verified webhook updates payment status only" contract.
 */
import Stripe from "stripe";

import { env } from "../../../config/env.service.js";
import { orderModel } from "../../database/model/order.model.js";

interface PaymentItem {
  en_name: string;
  quantity: number;
  price: number;
}

const isConfigured = (): boolean => Boolean(env.Secret_key_Stripe);

let client: Stripe | null = null;

const getStripe = (): Stripe | null => {
  if (!isConfigured()) {return null;}
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
          const reference =
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : session.id;

          await orderModel.findByIdAndUpdate(orderId, {
            paymentStatus: "paid",
            paymentProvider: "stripe",
            paymentReference: reference,
          });
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
