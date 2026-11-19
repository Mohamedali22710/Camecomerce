/** Provider-agnostic payment contract (MVP-01).
 *
 * Every payment adapter implements the same interface so checkout never depends
 * on provider-specific field names. Amounts cross this boundary as integer minor
 * units (halalas for SAR, piastres for EGP); conversion from major units is the
 * caller's responsibility.
 *
 * The order flow resolves an adapter through `payment.registry.ts` and never
 * imports a provider SDK directly.
 */

/** Provider identifiers accepted by the registry. */
export type PaymentProviderName = "paymob" | "mock";

/** Payment states the application understands, including terminal failures. */
export const PAYMENT_STATUSES = [
  "pending",
  "paid",
  "failed",
  "expired",
  "cancelled",
  "reconciliation_required",
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/** Online methods the storefront may offer. `cod` is handled separately. */
export const PAYMENT_METHOD_CODES = ["card", "mada", "apple_pay", "tabby", "tamara"] as const;

export type PaymentMethodCode = (typeof PAYMENT_METHOD_CODES)[number];

/** Where a verified event came from. Every source uses the same settlement path. */
export const PAYMENT_EVENT_TYPES = ["webhook", "inquiry", "session", "admin"] as const;

export type PaymentEventType = (typeof PAYMENT_EVENT_TYPES)[number];

/**
 * Outcome of processing one provider event. Persisted on the ledger row so a
 * reconciliation report can explain why an event did or did not change an order.
 */
export const PAYMENT_PROCESSING_RESULTS = [
  "applied",
  "duplicate",
  "ignored",
  "pending",
  "unknown_order",
  "amount_mismatch",
  "currency_mismatch",
  "reconciliation_required",
  "failed",
] as const;

export type PaymentProcessingResult = (typeof PAYMENT_PROCESSING_RESULTS)[number];

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
  /** Total in integer minor units (halalas/piastres). */
  amountMinor: number;
  /** Shipping portion in minor units, sent as its own provider line item. */
  shippingMinor?: number;
  currency: string;
  items: PaymentLineItem[];
  customer?: PaymentCustomer;
  /** Selected online method. Defaults to `card` when omitted. */
  method?: PaymentMethodCode;
  /** Public HTTPS webhook URL. */
  notificationUrl: string;
  /** Frontend result page. Never treated as payment confirmation. */
  redirectionUrl: string;
  /** Only enabled provider integration IDs are sent. */
  integrationIds?: number[];
}

/** Normalized result of starting a session. */
export interface CreateSessionResult {
  provider: PaymentProviderName;
  /** Provider order reference. Safe to persist and show to support. */
  providerReference: string;
  /** Provider session/intention id when the provider exposes one. */
  providerSessionId: string | null;
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
  /** Provider intention id when the callback includes it. */
  providerSessionId: string | null;
  orderNumber: string;
  status: PaymentStatus;
  success: boolean;
  amountMinor: number;
  currency: string;
  /**
   * True only after the provider authenticates the event: an HMAC-verified
   * webhook, or an authenticated inquiry response. Untrusted input never
   * reaches this shape.
   */
  verified: true;
  /** Which authoritative path produced the event. */
  source: Exclude<PaymentEventType, "admin">;
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
   * missing signatures. `query` carries query-string signature parameters
   * (Paymob sends `?hmac=`), never business data.
   */
  verifyAndParse(
    rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>,
    query?: Record<string, unknown>,
  ): Promise<VerifiedPaymentEvent>;

  fetchStatus(providerReference: string): Promise<FetchStatusResult>;

  refund?(input: RefundInput): Promise<RefundResult>;
}

/**
 * Frozen checkout response envelope (MVP-01). It is implemented by
 * `POST /v1/order` and `POST /v1/payment/session`.
 */
export interface CheckoutSessionResponse {
  orderId: string;
  orderNumber: string;
  paymentStatus: PaymentStatus;
  redirectUrl: string | null;
  provider: PaymentProviderName;
}
