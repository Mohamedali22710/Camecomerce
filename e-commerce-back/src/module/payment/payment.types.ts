/** Provider-agnostic payment contract (MVP-01).
 *
 * Every payment adapter (mock, Paymob, legacy providers) implements the same
 * interface so checkout never depends on provider-specific field names. Amounts
 * cross this boundary as integer minor units (halalas for SAR); conversion from
 * major units is the caller's responsibility.
 *
 * This module is intentionally imported by nothing yet. Wiring it into the order
 * flow happens in later tickets once credentials and endpoints are confirmed.
 */

/** Provider identifiers accepted by the registry. */
export type PaymentProviderName = "paymob" | "mock" | "stripe";

/** Payment states the application understands, including terminal failures. */
export const PAYMENT_STATUSES = ["pending", "paid", "failed", "expired", "cancelled"] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/** One order line as sent to the provider. */
export interface PaymentLineItem {
  /** Human-readable snapshot name; never a client-supplied price source. */
  name: string;
  quantity: number;
  /** Unit price in integer minor units. */
  unitAmountMinor: number;
  sku?: string;
}

/** Customer/billing data derived from the stored shipping address. */
export interface PaymentCustomer {
  fullName?: string;
  phone?: string;
  email?: string;
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}

/** Input required to start a hosted payment session. */
export interface CreateSessionInput {
  orderId: string;
  /** Human-readable order number; becomes the provider's special reference. */
  orderNumber: string;
  /** Total in integer minor units (halalas). */
  amountMinor: number;
  currency: string;
  items: PaymentLineItem[];
  customer?: PaymentCustomer;
  /** Public HTTPS webhook URL. */
  notificationUrl: string;
  /** Frontend result page. Never treated as payment confirmation. */
  redirectionUrl: string;
  /** Only enabled provider integration IDs are sent. */
  integrationIds?: number[];
}

/** Normalized result of starting a session. Matches the planned Paymob shape. */
export interface CreateSessionResult {
  provider: PaymentProviderName;
  /** Provider session/intention reference. Safe to persist and show to support. */
  providerReference: string;
  /** Transaction reference once the provider assigns one. */
  providerTransactionId: string | null;
  amountMinor: number;
  currency: string;
  paymentStatus: PaymentStatus;
  redirectUrl: string;
  /** Present only when a hosted checkout exposes a browser-side secret. */
  clientSecret: string | null;
}

/** Authoritative status returned by a provider inquiry. */
export interface FetchStatusResult {
  provider: PaymentProviderName;
  providerReference: string;
  providerTransactionId: string | null;
  status: PaymentStatus;
  amountMinor: number | null;
  currency: string | null;
  success: boolean;
}

/**
 * A provider event that has already passed signature verification.
 * `payload` is for internal processing only and must never be logged verbatim.
 */
export interface VerifiedPaymentEvent {
  provider: PaymentProviderName;
  providerTransactionId: string;
  providerReference: string;
  orderNumber: string;
  status: PaymentStatus;
  success: boolean;
  amountMinor: number;
  currency: string;
  hmacVerified: true;
  payload: Record<string, unknown>;
}

export interface RefundInput {
  providerTransactionId: string;
  amountMinor: number;
  reason?: string;
}

export interface RefundResult {
  providerTransactionId: string;
  status: "refunded" | "pending" | "failed";
  amountMinor: number;
}

/** Contract implemented by every payment adapter. */
export interface PaymentProvider {
  readonly name: PaymentProviderName;

  createSession(input: CreateSessionInput): Promise<CreateSessionResult>;

  /**
   * Verifies the provider signature over the raw request body and only then
   * parses it. Adapters must throw an `HttpError(401, ...)` for invalid or
   * missing signatures.
   */
  verifyAndParse(
    rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>,
  ): Promise<VerifiedPaymentEvent>;

  fetchStatus(providerReference: string): Promise<FetchStatusResult>;

  refund?(input: RefundInput): Promise<RefundResult>;
}

/**
 * Frozen checkout response envelope (MVP-01). Existing Stripe responses are
 * unchanged until the card path is migrated onto this contract.
 */
export interface CheckoutSessionResponse {
  orderId: string;
  orderNumber: string;
  paymentStatus: PaymentStatus;
  redirectUrl: string | null;
  provider: PaymentProviderName;
}
