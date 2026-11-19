# Frontend Integration Guide — Orders and Payments

| Field | Value |
| --- | --- |
| Status | Backend contract implemented; frontend integration can start |
| Updated | 2026-11-19 |
| Payment provider | Paymob only (Intention API + Unified Checkout); COD |
| Sandbox verification | **NOT TESTED** — no completed Paymob sandbox transaction |
| Egyptian credentials | API key, secret key, public key, and integration ID `6067` located; not exercised |
| Stripe | Removed; no adapter or rollback path |

This guide describes the HTTP flow the storefront should implement. It documents
the current backend behavior, including the mocked/unit-tested parts and the
parts that still require external verification. It does not claim that a real
Paymob payment has been completed.

## 1. What is ready

- Product and bundle checkout, COD, stock reservation, order expiry, tracking,
  admin filters, and reconciliation endpoints are implemented.
- Card checkout creates a Paymob intention and returns a hosted checkout URL.
- The webhook route preserves the exact raw request body and verifies Paymob
  HMAC-SHA512 over the documented 20 fields inside the parsed `obj` before
  trusting the event. The field order matches Paymob's official Transaction
  Processed documentation; no real callback has been received.
- The payment ledger deduplicates by `{ provider, providerTransactionId }`.
- A return-page query parameter can never mark an order paid.
- Mock and unit tests cover the payment contract without a database or real
  Paymob request.

Still external:

- A completed Paymob sandbox payment and a real callback still need a public
  HTTPS webhook URL and a verified HMAC secret. Egyptian API/secret/public keys
  and integration ID `6067` have been located, but no sandbox intention or
  callback has been exercised with them.
- Saudi Arabia (`PAYMOB_REGION=ksa`) has not been exercised.
- Mada, Apple Pay, Tabby, and Tamara are hidden unless the merchant activates
  them and their integration IDs are configured. Apple Pay also needs domain
  verification.

## 2. Base URL and authentication

API base: `{API_BASE_URL}` (for example `https://api.example.com`). All routes are
prefixed with `/v1`.

Protected routes use:

```http
Authorization: user <accessToken>
```

Admins use `admin` or `superAdmin` instead of `user`. The role segment selects the
JWT signing secret.

### Region and currency

`CURRENCY` is a separate deployment setting; it is not inferred from
`PAYMOB_REGION`. The two must agree. `CURRENCY` defaults to `SAR` when unset, so
an Egypt deployment must set `CURRENCY=EGP` explicitly. `config/.env.example` is
illustrative, not a validated region/currency pair; set both values explicitly
for the deployment.

| Deployment | `PAYMOB_REGION` | `CURRENCY` | Paymob origin | Credentials |
| --- | --- | --- | --- | --- |
| Egypt sandbox | `eg` | `EGP` | `https://accept.paymob.com` | Egyptian API/secret/public keys; located integration ID `6067` |
| Saudi Arabia | `ksa` | `SAR` | `https://ksa.paymob.com` | KSA API/secret/public keys and KSA integration IDs |

The backend rejects a configured base URL, checkout URL, or regional key prefix
that does not match `PAYMOB_REGION`; there is no silent fallback between regions.
Do not use the Egyptian keys or integration ID `6067` with
`PAYMOB_REGION=ksa`, and do not use KSA values with `PAYMOB_REGION=eg`. An EGP
amount sent to a KSA merchant (or the reverse) is also a configuration error.

The examples in this guide use the Egypt sandbox (`EGP`). The KSA response
variant is shown separately in Step 2. The located Egyptian integration ID
`6067` is not yet proven active or usable; its method mapping and a successful
intention creation still need a sandbox test.

### Credentials and browser exposure

| Value | Where it lives | Browser exposure |
| --- | --- | --- |
| `PAYMOB_API_KEY` (legacy API key) | Server only | Never returned; used to obtain the short-lived inquiry auth token |
| `PAYMOB_SECRET_KEY` (API Secret Key) | Server only | Never returned; sent as `Authorization: Token <secret>` to the Intention API |
| `PAYMOB_PUBLIC_KEY` | Server configuration | Embedded in `redirectUrl` for hosted checkout; public, but do not log the full URL |
| Paymob integration IDs (including `6067`) | Server configuration | Never returned; the browser sends only a payment method code |
| Intention `client_secret` | Returned by Paymob to the server | Embedded in `redirectUrl`; no separate response field; short-lived |
| `PAYMOB_HMAC_SECRET` | Server only | Never returned; used to verify callbacks |

`PAYMOB_HMAC_SECRET` is a distinct dashboard secret; it is not the API key, the
API Secret Key, or the public key.

`redirectUrl` is therefore a short-lived payment artifact even though the public
key is not secret: it contains the per-intention client secret required by
Paymob's hosted checkout.

## 3. Checkout sequence

```text
Storefront                    Backend                         Paymob
    |                           |                               |
    | GET /v1/payment/methods   |                               |
    |-------------------------->|                               |
    |<--------------------------| enabled methods + COD         |
    |                           |                               |
    | POST /v1/order            |                               |
    |-------------------------->| reserve stock, create order   |
    |                           | POST /v1/intention/           |
    |                           |------------------------------>|
    |                           |<------------------------------|
    |<--------------------------| redirectUrl                   |
    |                           |                               |
    | browser redirect to Paymob checkout                       |
    |---------------------------------------------------------->|
    |                           |<------------------------------|
    |                           | HMAC webhook (?hmac=...)      |
    |                           | verify, ledger, settle        |
    |                           |                               |
    | return to /checkout/success?orderId=...                   |
    | GET /v1/payment/status/:orderNumber                       |
    |-------------------------->| stored status                 |
    |<--------------------------|                               |
```

The webhook may arrive before or after the browser returns. The frontend must
treat the stored status returned by the status endpoint as the UI source of
truth, not the return URL. Online payment status changes come from a verified
webhook, an admin provider inquiry, an explicit admin status/reconciliation
action, or expiry; the return URL never changes it.

## 4. Step 1 — discover payment methods

```http
GET /v1/payment/methods
```

Public. Example response:

```json
{
  "message": "Payment methods",
  "data": {
    "cod": true,
    "provider": "paymob",
    "region": "eg",
    "environment": "sandbox",
    "methods": [
      { "code": "card", "label": "Credit / debit card" }
    ]
  }
}
```

Display COD from `cod`. Display only the returned online methods. Do not hardcode
Mada, Apple Pay, Tabby, or Tamara; they are absent until activated. If `methods` is
empty, card checkout is unavailable but COD still works.

The example assumes `PAYMOB_REGION=eg`. A KSA deployment returns
`"region": "ksa"` and must use the KSA/SAR configuration; never mix Egyptian
credentials or integration IDs into it.

When Paymob is not configured, the request still succeeds with
`methods: []`. Do not treat that as an error.

## 5. Step 2 — create the order

```http
POST /v1/order
Authorization: user <accessToken>
Content-Type: application/json
```

### COD

```json
{
  "useCart": true,
  "paymentMethod": "cod",
  "shippingAddress": {
    "fullName": "Customer",
    "phone": "+201000000000",
    "street": "Street",
    "city": "Cairo",
    "state": "Cairo",
    "zipCode": "11511",
    "country": "Egypt"
  },
  "idempotencyKey": "checkout-2026-11-19-001"
}
```

`cod` returns `201` with the created order. No payment redirect is needed.

### Card

```json
{
  "items": [
    {
      "productId": "507f1f77bcf86cd799439011",
      "color": "White",
      "size": "2TB",
      "quantity": 1
    }
  ],
  "paymentMethod": "card",
  "paymentMethodCode": "card",
  "shippingAddress": {
    "fullName": "Customer",
    "phone": "+201000000000",
    "street": "Street",
    "city": "Cairo",
    "country": "Egypt"
  },
  "idempotencyKey": "checkout-2026-11-19-002"
}
```

- `paymentMethodCode` is optional; the default is `card`.
- Only use a code returned by `GET /v1/payment/methods`.
- Sending `paymentMethodCode` with `paymentMethod: "cod"` returns `400`.
- Prices are always calculated server-side. Do not send a price.
- `useCart: true` builds the order from the stored cart. The cart is cleared only
  after a successful checkout response.
- `idempotencyKey` is optional but recommended. Reusing the same key for the same
  user returns the existing order with `200` instead of creating a duplicate.
  That replay returns the order DTO, not a fresh checkout URL. If the existing
  order is a pending card order, call `POST /v1/payment/session` to get a new
  session; a COD order needs no session.

Successful card response (`201`):

```json
{
  "message": "Redirect to payment",
  "data": {
    "url": "https://accept.paymob.com/unifiedcheckout/?publicKey=...&clientSecret=...",
    "redirectUrl": "https://accept.paymob.com/unifiedcheckout/?publicKey=...&clientSecret=...",
    "provider": "paymob",
    "orderId": "507f1f77bcf86cd799439011",
    "orderNumber": "CCTV-261119-AB12",
    "currency": "EGP",
    "paymentStatus": "pending"
  }
}
```

Use `redirectUrl` (or the legacy `url` alias) for the browser navigation. Store
`orderNumber` and `orderId` in `sessionStorage` before leaving the site.

The response does not contain a separate API key, API Secret Key, HMAC secret, or
`clientSecret` field. It does, however, expose the **public key** and the
short-lived **intention client secret** inside `redirectUrl`, because Paymob's
hosted checkout needs them. Treat the whole URL as a short-lived payment artifact:
do not log it, persist it in analytics, or share it after the checkout attempt.
The `url` alias is returned by order creation only; the retry endpoint returns
`redirectUrl` only.

#### KSA response variant

For a KSA deployment (`PAYMOB_REGION=ksa`, `CURRENCY=SAR`, KSA keys and KSA
integration IDs), the same order-creation DTO returns `SAR` and a KSA checkout
origin. This is a separate configuration; never use the Egyptian integration ID
`6067` or Egyptian keys here.

```json
{
  "message": "Redirect to payment",
  "data": {
    "url": "https://ksa.paymob.com/unifiedcheckout/?publicKey=...&clientSecret=...",
    "redirectUrl": "https://ksa.paymob.com/unifiedcheckout/?publicKey=...&clientSecret=...",
    "provider": "paymob",
    "orderId": "507f1f77bcf86cd799439011",
    "orderNumber": "CCTV-261119-AB12",
    "currency": "SAR",
    "paymentStatus": "pending"
  }
}
```

If a card session fails after the order is created, the backend cancels the
order, releases its stock once, and returns a safe error. If provider or method
validation fails before creation, no order or stock hold is created. Do not show
a “payment pending” page for a failed creation.

## 6. Step 3 — send the browser to Paymob

```ts
sessionStorage.setItem("pendingOrderNumber", data.orderNumber);
sessionStorage.setItem("pendingOrderId", data.orderId);
window.location.assign(data.redirectUrl);
```

Do not call the Paymob URL with `fetch` and do not embed it in an iframe unless
Paymob explicitly supports that flow for the merchant. The URL is a full hosted
checkout page. Card data stays with Paymob.

### Return URL

The backend creates:

```text
{FRONTEND_URL}/checkout/success?orderId=<mongo-order-id>
```

The return page must not mark anything paid. Paymob and the browser may append
other query parameters; ignore them for status decisions.

Recommended return-page behavior:

1. Read `orderId` from the query string only as a lookup hint.
2. Read `orderNumber` from `sessionStorage`. If it is missing, call
   `GET /v1/order/:id` with the user token and read `orderNumber` from the order.
3. Call `GET /v1/payment/status/:orderNumber`.
4. Poll until the status is terminal or the UI offers a retry/support action.

Do not trust `success=true`, `success=false`, `pending=true`, `txn_id`, or any
other return-page parameter. Forged parameters change nothing.

## 7. Step 4 — poll payment status

```http
GET /v1/payment/status/:orderNumber
Authorization: user <accessToken>
```

Example:

```json
{
  "message": "Payment status",
  "data": {
    "orderNumber": "CCTV-261119-AB12",
    "paymentStatus": "pending",
    "paymentMethod": "card",
    "currency": "EGP",
    "nextAction": "complete_payment"
  }
}
```

`paymentStatus` is one of `pending`, `paid`, `failed`, `expired`, `cancelled`,
or `reconciliation_required`. `paymentMethod` is the order's payment family:
`card` or `cod` (the specific online method, such as `mada`, is selected at
checkout but is not returned by this endpoint). An invalid order-number format
returns `400`; a missing or unowned order returns `404`.

`nextAction` matrix:

| `paymentStatus` | `nextAction` | Storefront behavior |
| --- | --- | --- |
| `pending` + `card` | `complete_payment` | Keep polling / offer “complete payment” if the session can be retried |
| `pending` + `cod` | `await_confirmation` | Show order confirmation; payment is collected on delivery |
| `paid` | `none` | Show success |
| `cancelled` | `none` | Show cancelled |
| `failed` | `contact_support` | Show failure and support path |
| `expired` | `contact_support` | Payment window elapsed; create a new order |
| `reconciliation_required` | `contact_support` | Do not show success; support must resolve the payment |

Suggested polling:

```ts
const delays = [2000, 3000, 5000, 8000, 13000, 21000];

for (const delay of delays) {
  const status = await getPaymentStatus(orderNumber);
  if (status.paymentStatus === "paid") return showSuccess();
  if (["failed", "expired", "cancelled", "reconciliation_required"].includes(status.paymentStatus)) {
    return showTerminalState(status);
  }
  await sleep(delay);
}

// The webhook may be delayed. Show a “still processing” state with a manual
// refresh button and a support link; do not invent a paid state.
showStillProcessing(orderNumber);
```

Polling never marks an order paid; it may apply lazy expiry to an abandoned card
order.

## 8. Retry a card session

If the customer closed the Paymob page but the order is still payable, retry:

```http
POST /v1/payment/session
Authorization: user <accessToken>
Content-Type: application/json
```

```json
{
  "orderNumber": "CCTV-261119-AB12",
  "method": "card"
}
```

Response `200`:

```json
{
  "message": "Redirect to payment",
  "data": {
    "orderId": "507f1f77bcf86cd799439011",
    "orderNumber": "CCTV-261119-AB12",
    "paymentStatus": "pending",
    "redirectUrl": "https://accept.paymob.com/unifiedcheckout/?publicKey=...&clientSecret=...",
    "provider": "paymob"
  }
}
```

This response has no `currency` field and no legacy `url` alias; use
`redirectUrl`. The backend reads the amount from the stored order, and the
request cannot change it. `method` defaults to `card` when omitted.

Do not retry when:

- the order is missing or owned by another user (`404`);
- `paymentStatus` is not `pending` (`409`);
- the payment window elapsed (`409`);
- stock was released (`409`);
- the order is COD (`409`);
- the selected method is disabled (`400`);
- Paymob is not configured (`503`).

A Paymob request failure during retry returns `502` but does not cancel the
existing order; it remains available for another retry if it is still pending.
For expired or stock-released orders, create a new order instead of retrying.

## 9. COD flow

1. Create the order with `paymentMethod: "cod"`.
2. Show the order confirmation and `paymentStatus: "pending"`.
3. There is no hosted checkout and no payment webhook.
4. `nextAction` is `await_confirmation`.
5. Admin fulfillment updates `orderStatus` and `shippingStatus` independently.

COD is always available, even when Paymob is not configured.

## 10. Order expiry and stock

Unpaid card orders hold stock for `PAYMENT_ORDER_TTL_MINUTES` (default 30). Expiry
is applied by the order-detail and payment-status endpoints, and by the admin
sweep. The frontend does not need a scheduler.

When an order expires:

- `paymentStatus` becomes `expired`;
- reserved product and bundle-component stock is released exactly once;
- the order is no longer payable;
- `nextAction` becomes `contact_support`.

A late payment after expiry becomes `reconciliation_required`; it is not shown as
paid and must not be treated as a successful checkout.

## 11. Order tracking

By order id:

```http
GET /v1/order/:id/tracking
Authorization: user <accessToken>
```

By order number:

```http
GET /v1/order/track/:orderNumber
Authorization: user <accessToken>
```

Both return:

```json
{
  "message": "Order tracking",
  "data": {
    "orderNumber": "CCTV-261119-AB12",
    "orderStatus": "processing",
    "paymentStatus": "paid",
    "shippingStatus": "shipped",
    "shippingCarrier": "Carrier",
    "trackingNumber": "TRACK-123",
    "estimatedDelivery": null,
    "currency": "EGP",
    "events": [
      {
        "at": "2026-11-19T10:00:00.000Z",
        "field": "orderStatus",
        "from": "none",
        "to": "pending"
      }
    ]
  }
}
```

`events` is chronological. Internal actor ids, admin reasons, provider references,
and admin notes are excluded. The by-id route is owner-or-admin; the by-number
route is owner-only. Another user’s order and a missing order both return `404`.
`estimatedDelivery` is currently always `null`.

## 12. Paymob webhook and HMAC verification

This is a provider-facing route. The frontend must never call it.

```http
POST /v1/payment/paymob/webhook?hmac=<lowercase-hex>
Content-Type: application/json
```

The route is mounted before the JSON body parser, so the exact received bytes are
preserved. The backend parses those bytes as JSON and then verifies the `hmac`
query parameter before trusting the transaction object, `obj`. The HMAC is **not**
computed over the raw bytes; it is computed over 20 values read from `obj`.

For a Transaction Processed (POST) callback, concatenate these values in this
exact order with no separator:

```text
amount_cents
created_at
currency
error_occured
has_parent_transaction
id                 (obj.id)
integration_id
is_3d_secure
is_auth
is_capture
is_refunded
is_standalone_payment
is_voided
order.id           (obj.order.id)
owner
pending
source_data.pan
source_data.sub_type
source_data.type
success
```

Convert each value to its string form (`true`/`false` for booleans; no
reformatting of received numbers or dates; `null`/`undefined` becomes an empty
string in this implementation). Compute HMAC-SHA512 with `PAYMOB_HMAC_SECRET`,
hex-encode the result in lowercase, and compare it in constant time with the
`hmac` query parameter.

This order was checked against Paymob's official
[HMAC Transaction Callback](https://developers.paymob.com/paymob-docs/developers/webhook-callbacks-and-hmac/hmac/hmac-transaction-callback)
documentation. This route handles the Transaction Processed POST callback only;
GET Response and card-token HMAC variants are not handled here.

Responses:

- `200` for accepted, duplicate, unknown-order, or business-rejected events.
- `400` for an unreadable body, missing `obj`, or another invalid transaction shape.
- `401` for a missing or invalid HMAC; no payment state is written.
- `503` when Paymob is not configured.
- `5xx` only when local persistence failed, so Paymob may retry.

No real Paymob callback has been received or verified. HMAC-secret validity and
the merchant-specific callback shape remain unverified until a sandbox callback
is captured.

## 13. Error and recovery matrix

| Situation | Backend response | Frontend action |
| --- | --- | --- |
| Unknown/disabled online method | `400` | Refresh methods; do not retry the same code |
| `paymentMethodCode` sent with COD | `400` | Remove the field |
| Missing/empty cart with `useCart` | `400` | Return to cart |
| Product or bundle no longer exists/inactive | `404` | Refresh catalog/cart |
| Variant not found or insufficient stock (including bundle components) | `400` | Re-render cart and availability |
| Duplicate idempotency key | `200` with existing order | Use the returned order; do not create another. It is not a fresh checkout URL; retry only a pending card session |
| Paymob not configured | `503` | Hide card or show “card unavailable”; COD remains |
| Paymob request failed during order creation | `502` | Show retry; order creation already cancelled and stock released |
| Paymob request failed during session retry | `502` | Keep the existing order; retry later if still pending |
| Payment session requested for missing/foreign order | `404` | Do not reveal existence |
| Payment session requested for expired order | `409` | Create a new order |
| Payment session requested for non-pending order | `409` | Re-read status |
| Payment status requested for another user | `404` | Do not reveal existence |
| Payment sync debounce | `429` | Wait at least 10 seconds |
| Webhook rejected signature | `401` (provider-facing) | No frontend action; no state changed |
| Webhook persistence failure | `5xx` (provider-facing) | Paymob may retry |
| Late payment after stock release | `reconciliation_required` | Show support message; never show success |

## 14. Admin operations (for an admin UI)

| Endpoint | Purpose |
| --- | --- |
| `GET /v1/order/admin` | Filters: `page`, `limit` (1–100), `orderStatus`, `paymentStatus`, `shippingStatus`; `sort` is `createdAt`, `-createdAt`, `totalAmount`, or `-totalAmount` |
| `PATCH /v1/order/admin/:id` | At least one of `orderStatus`, `paymentStatus`, `shippingStatus`, `shippingCarrier`, `trackingNumber`, or `reason`; manual `paid` needs a reason |
| `POST /v1/order/admin/:id/sync-payment` | Card orders only; authoritative Paymob inquiry; no body; debounced 10 s |
| `POST /v1/order/admin/:id/reconcile-payment` | Card orders only; resolve late/mismatched payment; JSON body below |
| `POST /v1/order/admin/expire-sweep` | Release expired unpaid card stock; optional `limit` (1–200), default 50 |

Admin filter enums:

- `orderStatus`: `pending`, `processing`, `shipped`, `delivered`, `cancelled`
- `paymentStatus`: `pending`, `paid`, `failed`, `expired`, `cancelled`, `reconciliation_required`
- `shippingStatus`: `pending`, `prepared`, `shipped`, `delivered`, `returned`, `cancelled`

`reconcile-payment` body:

```json
{
  "resolution": "paid",
  "reason": "Provider settlement confirmed after expiry",
  "reacquireStock": true
}
```

- `resolution` is `paid` or `cancelled`.
- `reason` is required and must be 3–1000 characters.
- `reacquireStock` is a boolean. When the stock hold was already released and
  `resolution` is `paid`, omitting it returns `400`; if inventory is no longer
  available, the transaction fails and no partial update is committed.
- A paid order cannot be cancelled through reconciliation (`409`).

Manual `paid` through `PATCH` is refused with `409` when stock was released or the
payment is `expired`, `cancelled`, or `reconciliation_required`. Use
`reconcile-payment` for those states.

## 15. Mock mode for local frontend development

Set `PAYMENT_PROVIDER=mock` in a non-production environment. The mock adapter
returns a local redirect URL and never contacts Paymob. It is a development aid,
not a complete payment simulator: its signed-event verifier is exercised in unit
tests, but **no public mock webhook route is mounted**. Do not enable mock mode in
production.

Mock mode proves:

- the checkout envelope and redirect flow;
- the status endpoint and `nextAction` values;
- the stock and expiry behavior.

It does not prove:

- that Paymob accepts the intention payload;
- that a real Paymob callback passes HMAC verification with the merchant secret;
- that Mada, Apple Pay, Tabby, or Tamara render or settle;
- that KSA credentials work.

## 16. Security rules for the frontend

- Never display or log a Paymob secret key, API key, or HMAC secret. The backend
  does not return those values.
- The `redirectUrl` contains the public key and the intention client secret that
  the hosted checkout needs. Treat the URL as a short-lived payment artifact: do
  not log it, persist it in analytics, or expose it after the checkout attempt.
- Never mark a payment paid from a return URL, query parameter, local storage, or
  client-side state.
- Never send card numbers, CVV, or expiry to this API.
- Use HTTPS in staging and production. The webhook URL must be public HTTPS.
- Keep the user access token out of URLs and logs.
- Treat `reconciliation_required` as “do not fulfill” until support resolves it.

## 17. Known blockers

The frontend can build and test against the contract and mock mode now. The
following remain open and are tracked in
[implementation/EXTERNAL_INTEGRATION_BLOCKERS.md](implementation/EXTERNAL_INTEGRATION_BLOCKERS.md):

- public HTTPS webhook URL and a real callback that passes HMAC verification with
  the merchant secret;
- Egyptian API/secret/public keys and integration ID `6067` have been located, but
  the HMAC secret validity, integration activation/method mapping, and a completed
  sandbox transaction are still unverified;
- Paymob KSA merchant credentials and a KSA sandbox test;
- Mada activation;
- Apple Pay merchant/domain verification;
- Tabby and Tamara agreements.

Until those are resolved, do not describe card checkout as production-verified.
