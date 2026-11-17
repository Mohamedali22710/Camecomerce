# CCTV E-Commerce API Documentation

Base URL: `http://localhost:3007` (configurable with `PORT` / `BASE_URL`).
All routes are prefixed with `/v1`.

## Contents

- [Conventions](#conventions)
- [Health](#health)
- [Authentication](#authentication-endpoints)
- [User Profile](#user-profile)
- [Categories](#categories)
- [Subcategories](#subcategories)
- [Products](#products)
- [Bundles](#bundles)
- [Cart](#cart)
- [Wishlist](#wishlist)
- [Orders and Payments](#orders-and-payments)
- [Payment Provider Contract](#payment-provider-contract)
- [Installation Requests](#installation-requests)
- [Contact](#contact)
- [Security Logs](#security-logs)
- [Data Models](#data-models)
- [Security Behavior](#security-behavior)

## Conventions

### Authentication header

Protected routes read the role from the first segment of the header and use it to
select the JWT signing secret:

```http
Authorization: user <accessToken>
Authorization: admin <accessToken>
Authorization: superAdmin <accessToken>
```

Access and refresh tokens are JWTs with a `type` claim. A refresh token sent to a
protected route, or an access token sent to the refresh endpoint, is rejected.

### Response shape

Successful responses use:

```json
{ "message": "Human-readable result", "data": {} }
```

Validation failures use:

```json
{
  "message": "validation error",
  "error": [{ "path": "email", "message": "Invalid email address" }]
}
```

Other errors use `{ "message": "..." }` and may include `errors`.

### Common status codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Invalid input, invalid id, invalid status transition |
| 401 | Missing or invalid access token |
| 403 | Authenticated but not allowed |
| 404 | Resource not found |
| 409 | Duplicate resource or conflicting state |
| 413 | Request body too large |
| 500 | Unhandled server/SMTP/provider error |
| 502 | Payment session could not be created |
| 503 | Optional integration is not configured (Google, Redis, contact recipient) |

### Pagination and sorting

List endpoints that paginate accept `page` (1-based, default 1) and `limit`
(max 100). Product lists default to 10 per page; category lists to 20;
subcategory lists to 25; order and installation admin lists to 20 and 50
respectively.

Sorting uses `field_asc` or `field_desc`:

- Products: `price`, `en_name`, `ar_name`, `fr_name`, `createdAt`
- Categories and subcategories: `en_name`, `ar_name`, `fr_name`, `isActive`,
  `createdAt`, `updatedAt`

Invalid pagination or sort values return `400`.

### Rate limits

Rate limits are per IP, in memory, and per process:

| Endpoint group | Limit |
|----------------|-------|
| Signup | 5 requests / 60 s |
| Login | 10 / 60 s |
| Resend verification, forgot password | 3 / 60 s |
| Reset password | 5 / 60 s |
| Refresh access token | 20 / 60 s |
| Create order | 20 / 60 s |
| Contact form | 5 / 60 s |

---

## Health

### `GET /v1/health`

Public. Returns the API status and configured currency.

```json
{ "status": "ok", "currency": "SAR" }
```

---

## Authentication Endpoints

### `POST /v1/auth/signup`

Public, rate-limited. A super admin access token may create staff accounts.

```json
{
  "email": "user@example.com",
  "password": "minimum-8-characters",
  "confirmPassword": "minimum-8-characters",
  "role": "user",
  "phone": "+966500000000"
}
```

- `role` is optional (`user`, `admin`, `superAdmin`); privileged roles require a
  super admin token.
- Public signups are created inactive until email verification. Staff accounts
  created by a super admin are active immediately.
- `name` and the Arabic/French profile fields are not accepted here; `phone` is
  optional and must use international format.

`201` response:

```json
{
  "message": "Signup successful — verification email sent",
  "data": { "email": "user@example.com" }
}
```

If SMTP is unavailable, the account is still created and the message says the
verification email could not be sent.

### `POST /v1/auth/login`

Public, rate-limited.

```json
{ "email": "user@example.com", "password": "minimum-8-characters" }
```

`200` response:

```json
{
  "message": "Login successful",
  "data": {
    "accessToken": "<jwt>",
    "refreshToken": "<jwt>",
    "role": "user",
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "user",
      "email": "user@example.com",
      "imageURL": null
    }
  }
}
```

Unknown email, Google-only account, wrong password, unverified account, and
blocked account return `401` or `403` as appropriate without revealing which
emails exist (except the explicit verification/blocked messages).

### `GET /v1/auth/google/signup`

Public. Redirects to Google. Returns `503` when
`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` are not configured. State is stored in
a signed HttpOnly cookie and verified on the callback.

### `GET /v1/auth/google/signup/callback`

Public callback. Creates an active `user` account and returns the same token
payload as login:

```json
{
  "message": "Google signup successful",
  "data": {
    "accessToken": "<jwt>",
    "refreshToken": "<jwt>",
    "user": { "_id": "...", "role": "user", "name": "user", "email": "user@example.com" }
  }
}
```

### `GET /v1/auth/google/login`

Public. Redirects to Google, or `503` when unconfigured.

### `GET /v1/auth/google/login/callback`

Public. Redirects to:

```text
${FRONTEND_URL}/auth/callback#accessToken=...&refreshToken=...&role=...
```

Tokens are placed in the URL fragment so they are not sent to the server or
recorded in server logs.

### `GET /v1/auth/verify-email/:token`

Public. Marks the account active. Returns `{ "message": "Email verified successfully" }`.
Already-verified accounts return `{ "message": "Email already verified" }`.

### `POST /v1/auth/resend-verify-email`

Public, rate-limited.

```json
{ "email": "user@example.com" }
```

Always returns a generic `200` so account existence is not disclosed.

### `POST /v1/auth/forgot-password`

Public, rate-limited. Requires Redis; otherwise returns `503`.

```json
{ "email": "user@example.com" }
```

Always returns a generic `200` when the flow is available. Reset tokens are
single-use and expire after 15 minutes.

### `POST /v1/auth/reset-password/:token`

Public, rate-limited.

```json
{ "password": "new-password", "confirmPassword": "new-password" }
```

`200` on success; `400` for an invalid/used token; `503` when Redis is
unavailable.

### `POST /v1/auth/access-token`

Rate-limited. Send the refresh token as either the whole header or the second
segment:

```http
Authorization: user <refreshToken>
```

`200` response:

```json
{
  "message": "Access token refreshed successfully",
  "data": { "accessToken": "<jwt>" }
}
```

---

## User Profile

### `GET /v1/user/profile`

Authenticated. Returns the caller's profile without `password` or `googleId`.

### `PUT /v1/user/profile`

Authenticated. Accepts JSON or `multipart/form-data` with an optional `image`
file (max 2 MB).

```json
{ "name": "New name", "phone": "+966500000000" }
```

`200` returns the updated public profile. Replacing an existing image deletes
the old stored file.

### `POST /v1/user/upload-avatar`

Authenticated. `multipart/form-data` with field `image` (max 2 MB). Returns:

```json
{ "message": "Avatar uploaded", "data": { "imageURL": "https://..." } }
```

---

## Categories

### `GET /v1/category`

Public. Returns active categories with active subcategories and active products
populated:

```json
{ "message": "Categories", "data": [/* categories */] }
```

### `GET /v1/category/:id/subcategories`

Public. Returns active subcategories and active products for an active category;
`404` when the category is missing or inactive.

### `POST /v1/category/admin`

Admin/SuperAdmin. JSON or multipart with field `image` (max 10 MB).

```json
{ "en_name": "Cameras", "ar_name": "كاميرات", "fr_name": "Caméras" }
```

`en_name` is required. Duplicate English, Arabic, or French names return `409`.

### `PUT /v1/category/admin/:id`

Admin/SuperAdmin. JSON or multipart with optional `image` (max 2 MB). Accepts any
of `en_name`, `ar_name`, `fr_name`, `imageURL`; at least one field is required.

### `GET /v1/category/admin`

Admin/SuperAdmin. Paginated list including inactive categories. Query:
`page`, `limit`, `sort`.

### `GET /v1/category/admin/:id`

Admin/SuperAdmin. Returns a category with all subcategories and products.

### `DELETE /v1/category/admin/:id`

Admin/SuperAdmin. Soft-deletes the category and cascades `isActive: false` to its
subcategories and their products.

---

## Subcategories

### `GET /v1/subcategory`

Public. Returns active subcategories with active products populated.

### `GET /v1/subcategory/:id`

Public. Returns an active subcategory with active products, or `404`.

### `GET /v1/subcategory/admin`

Admin/SuperAdmin. Paginated list including inactive subcategories. Query:
`page`, `limit`, `sort`, `categoryId`, `en_name`, `q` (regex search on
`en_name`).

### `GET /v1/subcategory/admin/:id`

Admin/SuperAdmin. Returns a subcategory with all products.

### `POST /v1/subcategory/admin`

Admin/SuperAdmin.

```json
{ "en_name": "Indoor cameras", "ar_name": "كاميرات داخلية", "categoryId": "507f1f77bcf86cd799439011" }
```

The parent category must exist. Duplicate names inside the same category return
`409`.

### `PUT /v1/subcategory/admin/:id`

Admin/SuperAdmin. Accepts `en_name`, `ar_name`, `fr_name`, `categoryId`,
`isActive`; at least one field is required. Changing `isActive` updates all
products in the subcategory.

### `DELETE /v1/subcategory/admin/:id`

Admin/SuperAdmin. Soft-deletes the subcategory and its products.

---

## Products

### Product payload

JSON create/update:

```json
{
  "en_name": "Indoor camera",
  "ar_name": "كاميرا داخلية",
  "fr_name": "Caméra intérieure",
  "en_description": "1080p indoor camera",
  "ar_description": "كاميرا داخلية 1080p",
  "fr_description": "Caméra intérieure 1080p",
  "price": 199.99,
  "discount": 10,
  "brand": "Hikvision",
  "subcategoryId": "507f1f77bcf86cd799439011",
  "variants": [{ "color": "White", "size": "2TB", "stock": 20 }],
  "specifications": [
    { "keyEn": "Resolution", "keyAr": "الدقة", "valueEn": "4", "valueAr": "4", "unit": "MP" }
  ],
  "colorImages": [{ "color": "White", "imageURL": "data:image/png;base64,..." }]
}
```

`multipart/form-data` rules:

- `variants`, `specifications`, and `colorImages` must be JSON strings.
- `images` accepts up to 5 files, each up to the route limit.
- `colorImages[].imageURL` may be a hosted URL or a data URI; data URIs are
  uploaded to storage.
- `size` is a free-form label and is not a garment size.
- Missing `color`/`size` labels normalize to `Default`.
- At least one variant is required. `stock` is required and is an integer >= 0.
- `brand` is optional, max 80 characters; blank input is stored as `null`.
- `specifications` is optional, max 40 entries. Each entry requires `keyEn` and
  `valueEn` (max 60 and 200 characters). `keyAr`, `valueAr`, and `unit` (max 30)
  are optional. Invalid input returns `400` with the field path.

Product responses expose `brand` (or `null`), `variants` as an array,
`specifications` as an array (legacy/missing rows return `[]`), `imageURLs` as an
array, `colorImages` as an object keyed by color, and `currency`.

### `GET /v1/products`

Public. Active products only.

Query: `page`, `limit`, `minPrice`, `maxPrice`, `search` (English/Arabic/French
name), `sort` (`price_asc|desc`, `en_name_asc|desc`, `ar_name_asc|desc`,
`fr_name_asc|desc`, `createdAt_asc|desc`).

```json
{
  "message": "Products",
  "data": { "products": [], "total": 0, "page": 1, "limit": 10, "currency": "SAR" }
}
```

### `GET /v1/products/:id`

Public. Active product or `404`.

### `GET /v1/products/category/:categoryId`

Public. Active products in active subcategories of the category. Same query and
pagination as the main list. A valid category with no matching products returns
an empty list.

### `GET /v1/products/subcategory/:subcategoryId`

Public. Active products in the subcategory. Same query and pagination.

### `POST /v1/products/admin`

Admin/SuperAdmin. `multipart/form-data`, field `images` (up to 5, each max 2 MB),
plus the product fields above.

### `PUT /v1/products/admin/:id`

Admin/SuperAdmin. `multipart/form-data`, field `images` (up to 5, each max 10 MB).
At least one field is required. Uploading new images replaces and deletes the
previous stored images. `isActive` accepts `"true"`/`"false"` from multipart.

### `GET /v1/products/admin`

Admin/SuperAdmin. Paginated list including inactive products. Same query as the
public list.

### `GET /v1/products/admin/:id`

Admin/SuperAdmin. Returns a product regardless of `isActive`.

### `DELETE /v1/products/admin/:id`

Admin/SuperAdmin. Soft-deletes the product (`isActive: false`).

---

## Bundles

A bundle is a fixed CCTV kit (for example 4 or 8 cameras) with server-owned
prices. Clients never send a price; they send option codes that the server
validates against the bundle itself.

**Inventory note (DEC-01, open).** The bundle model currently has **no stock
field** and no component/HDD stock deduction. Whether a bundle keeps its own
availability counter or derives it from component stock is a pending business
decision. Public responses therefore omit `availability` rather than claiming
stock that has not been defined.

### Bundle payload

Admin create/update (`application/json`):

```json
{
  "code": "KIT-4CAM",
  "en_name": "4-camera kit",
  "ar_name": "طقم 4 كاميرات",
  "description": "Four cameras with a recorder",
  "imageURLs": ["https://cdn.example/bundle.jpg"],
  "basePrice": 1000,
  "discount": 10,
  "cameras": [
    {
      "productId": "507f1f77bcf86cd799439011",
      "color": "White",
      "size": "Default",
      "quantity": 4
    }
  ],
  "hddOptions": [
    { "code": "1TB", "labelEn": "1 TB", "labelAr": "1 تيرا", "priceDelta": 0 },
    { "code": "2TB", "labelEn": "2 TB", "labelAr": "2 تيرا", "priceDelta": 200 }
  ],
  "installationOptions": [
    { "code": "none", "labelEn": "Without installation", "priceDelta": 0 },
    {
      "code": "riyadh",
      "labelEn": "Installation in Riyadh",
      "priceDelta": 300,
      "city": "Riyadh"
    }
  ],
  "isActive": true
}
```

Rules:

- `code` is unique. A duplicate returns `409` through the existing error handler.
- `basePrice` must be greater than zero; `discount` is a percentage from 0 to 100.
- At least one camera component and at least one HDD and installation option are
  required.
- Option codes must be unique inside each list (case-insensitive).
- `priceDelta` must be non-negative.
- Every `productId` must exist. An unknown component returns `404` naming the
  component index. Inactive products are accepted but returned in `warnings`.
- `stock` and `availability` are rejected until DEC-01 is resolved.

### Pricing rule

```text
discountedBasePrice = roundMoney(basePrice - basePrice * discount / 100)
unitTotal           = discountedBasePrice + hdd.priceDelta + installation.priceDelta
lineTotal           = roundMoney(unitTotal * quantity)
```

A negative or malformed option delta is treated as `0`. Unknown option codes
return `400` naming the option.

### `POST /v1/bundles/admin`

Admin/SuperAdmin. Creates a bundle. Response `201`:

```json
{
  "message": "Bundle created",
  "data": { "code": "KIT-4CAM", "addedByEmail": "admin@example.com", "currency": "SAR" },
  "warnings": []
}
```

### `PUT /v1/bundles/admin/:id`

Admin/SuperAdmin. Partial update; at least one field is required. Changing
`cameras` re-validates the referenced products.

### `GET /v1/bundles/admin`

Admin/SuperAdmin. Paginated list including inactive bundles. Query: `page`,
`limit`, `minPrice`/`maxPrice` (against `basePrice`), `search` (names and `code`),
`sort` (`basePrice`, `en_name`, `ar_name`, `code`, `createdAt` with `_asc`/`_desc`).

### `GET /v1/bundles/admin/:id`

Admin/SuperAdmin. Returns a bundle regardless of `isActive`.

### `DELETE /v1/bundles/admin/:id`

Admin/SuperAdmin. Soft-deletes the bundle (`isActive: false`).

### `GET /v1/bundles`

Public. Active bundles only, paginated, newest first by default:

```json
{
  "message": "Bundles",
  "data": {
    "bundles": [],
    "total": 0,
    "page": 1,
    "limit": 10,
    "currency": "SAR"
  }
}
```

### `GET /v1/bundles/:id`

Public. Active bundle only; inactive returns `404`. Example:

```json
{
  "message": "Bundle",
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "code": "KIT-4CAM",
    "en_name": "4-camera kit",
    "basePrice": 1000,
    "discount": 10,
    "finalPrice": 900,
    "currency": "SAR",
    "cameras": [
      {
        "productId": "507f1f77bcf86cd799439011",
        "color": "White",
        "size": "Default",
        "quantity": 4,
        "en_name": "Indoor camera",
        "isActive": true
      }
    ],
    "hddOptions": [{ "code": "1TB", "labelEn": "1 TB", "priceDelta": 0 }],
    "installationOptions": [{ "code": "none", "labelEn": "Without installation", "priceDelta": 0 }]
  }
}
```

Public responses never include `addedByEmail` or `__v`.

---

## Cart

All cart routes require a `user` role access token.

### `POST /v1/cart`

```json
{
  "productId": "507f1f77bcf86cd799439011",
  "color": "White",
  "size": "2TB",
  "quantity": 2
}
```

`color` and `size` are optional and default to `Default`. The product must be
active and the variant must exist with enough stock. Adding an existing
variant/color/size combination increases its quantity.

Bundle line (server-priced; a client `price` field is ignored):

```json
{
  "itemType": "bundle",
  "bundleId": "507f1f77bcf86cd799439012",
  "hddOption": "HDD-2TB",
  "installationOption": "INSTALL-BASIC",
  "quantity": 1
}
```

The bundle must be active and both option codes must exist in its stored
configuration. Bundle inventory stays unknown until DEC-01 is resolved, so bundle
lines report `availabilityUnknown: true` and never claim stock.

`201` when a new line is created; `200` when an existing line is updated.

### `GET /v1/cart`

Returns lines with per-line `itemType`, product/bundle summary, resolved
bundle option labels, availability, stock, unit price, line subtotal, and the
cart `subtotal`, `shippingCost`, `total`, and `currency`. Mixed product/bundle
carts are summed from the same server-side line totals used at checkout.

### `PUT /v1/cart/:lineId`

```json
{ "quantity": 3 }
```

Updates any line (product or bundle) by its cart line `_id`. Rejects quantity
above available product stock; bundle option availability is re-validated.

### `DELETE /v1/cart/:lineId`

Removes any line (product or bundle) by its cart line `_id`.

### `PUT /v1/cart/:productId/:color/:size` (legacy)

Product-only route kept for existing clients. Use the exact stored labels
(URL-encoded) and `Default` for the default variant.

### `DELETE /v1/cart/:productId/:color/:size` (legacy)

Removes one product line.

### `DELETE /v1/cart`

Clears the caller's cart.

---

## Wishlist

All wishlist routes require a `user` role access token.

### `POST /v1/wishlist/:productId`

Adds an active product. Duplicate adds return `409`.

### `GET /v1/wishlist`

Returns the caller's wishlist with populated product summaries.

### `DELETE /v1/wishlist/:productId`

Removes one product from the wishlist.

---

## Orders and Payments

### Order statuses

| Field | Values |
|-------|--------|
| `orderStatus` | `pending`, `processing`, `shipped`, `delivered`, `cancelled` |
| `paymentStatus` | `pending`, `paid`, `failed` |
| `shippingStatus` | `pending`, `prepared`, `shipped`, `delivered`, `returned`, `cancelled` |

These are independent. The webhook changes payment status only. Installation has
its own workflow.

### `POST /v1/order`

Authenticated. Rate-limited.

```json
{
  "items": [
    {
      "productId": "507f1f77bcf86cd799439011",
      "color": "White",
      "size": "2TB",
      "quantity": 2
    }
  ],
  "paymentMethod": "cod",
  "shippingAddress": {
    "fullName": "Customer",
    "phone": "+966500000000",
    "street": "Street",
    "city": "Riyadh",
    "state": "Riyadh",
    "zipCode": "12345",
    "country": "Saudi Arabia"
  },
  "installation": {
    "preferredDate": "2026-12-01T10:00:00.000Z",
    "notes": "Second floor"
  },
  "idempotencyKey": "checkout-attempt-1"
}
```

- `items` must contain at least one active product or bundle line. Product
  variants must exist with enough stock; bundle option codes must exist in the
  stored bundle configuration.
- `useCart: true` (or an omitted/empty `items` array) builds the order from the
  caller's stored cart. The cart is revalidated and re-priced at order time and is
  cleared only after a successful checkout response. A validation or stock failure
  leaves the cart untouched.
- Bundle items use `{ "itemType": "bundle", "bundleId", "hddOption",
  "installationOption", "quantity" }`. Explicit items and cart checkout may be
  mixed across lines but each request uses one mode.
- Prices and totals are calculated server-side; client prices are ignored.
- `installation` is optional. When present, an installation request is created
  for `cod` orders immediately, and for `card` orders after the payment session
  is created successfully.
- `idempotencyKey` is optional. Repeating the same key for the same user returns
  the existing order with `200` instead of creating a duplicate or clearing the
  cart again.
- Stock is reserved in a MongoDB transaction, so MongoDB must run as a replica
  set for checkout to work. Product stock is decremented once per order; bundle
  stock is intentionally untouched (DEC-01).
- Every new order receives a unique `orderNumber` in the form
  `CCTV-YYMMDD-XXXX`. Legacy rows without one are serialized with a
  display-only `CCTV-LEGACY-XXXXXXXX` fallback.

`cod` response: `201`

```json
{ "message": "Order created", "data": {/* order, including orderNumber */} }
```

`card` response: `201`

```json
{
  "message": "Redirect to payment",
  "data": {
    "url": "https://checkout.stripe.com/...",
    "orderId": "507f1f77bcf86cd799439011",
    "orderNumber": "CCTV-261117-AB12",
    "currency": "SAR"
  }
}
```

If Stripe is not configured or session creation fails, the order is cancelled,
reserved product stock is restored exactly once, no installation request is
created, and the response is `502`.

### `GET /v1/order/mine`

Authenticated. Returns the caller's orders newest first:

```json
{ "message": "Orders", "data": { "orders": [], "currency": "SAR" } }
```

### `GET /v1/order/admin`

Admin/SuperAdmin. Paginated (`page`, `limit` default 50, max 100), newest first,
with `total`.

### `PATCH /v1/order/admin/:id`

Admin/SuperAdmin. At least one field:

```json
{
  "orderStatus": "cancelled",
  "paymentStatus": "failed",
  "shippingStatus": "returned",
  "shippingCarrier": "Carrier name",
  "trackingNumber": "TRACK-123",
  "reason": "Customer request"
}
```

Transitions are enforced before any write:

| Status | Allowed next values | Terminal |
|---|---|---|
| `orderStatus` | `pending → processing/shipped/cancelled`, `processing → shipped/cancelled`, `shipped → delivered/cancelled` | `delivered`, `cancelled` |
| `paymentStatus` | `pending → paid/failed`, `failed → paid` | `paid` |
| `shippingStatus` | `pending → prepared/shipped/delivered/cancelled/returned`, `prepared → shipped/delivered/cancelled/returned`, `shipped → delivered/cancelled/returned` | `delivered`, `returned`, `cancelled` |

An illegal transition returns `400` and changes nothing. Marking an order `paid`
manually requires a non-empty `reason`. Every accepted change appends
`{ at, actor, actorId, field, from, to, reason }` to `statusHistory`.

Moving `orderStatus` into `cancelled` restores reserved product stock exactly
once, guarded by `stockReleasedAt`. Bundle stock is not restored because bundle
inventory is still undecided (DEC-01).

### `GET /v1/order/:id`

Owner or admin. Returns the order with parsed `items` and `shippingAddress`.

### `POST /v1/order/webhook`

Public Stripe webhook. Must receive the raw request body and a valid
`stripe-signature` header. The route is mounted before the JSON body parser.

- `checkout.session.completed` and `checkout.session.async_payment_succeeded`
  set `paymentStatus: "paid"` and store the provider reference **only when** the
  session reports `payment_status: "paid"` and its `amount_total` and `currency`
  match the stored order. A mismatch is logged and ignored.
- `checkout.session.async_payment_failed` and `checkout.session.expired` set
  `paymentStatus: "failed"` unless the order is already paid.
- Response: `200 { "received": true }`, or `400` for an invalid signature/event.

### `GET /v1/payment/status/:orderNumber`

Owner or admin. Returns only the stored payment state; query-string parameters
such as `?success=true` are ignored and can never mark an order paid. Another
user's order returns `404`.

```json
{
  "message": "Payment status",
  "data": {
    "orderNumber": "CCTV-261117-AB12",
    "paymentStatus": "pending",
    "paymentMethod": "card",
    "currency": "SAR",
    "nextAction": "complete_payment"
  }
}
```

`nextAction` is `none` (paid), `complete_payment` (pending card),
`await_confirmation` (pending cash on delivery), or `contact_support` (failed).
The response never includes `paymentReference`, provider secrets, or raw provider
payloads.

---

## Payment Provider Contract

**Status:** the provider-agnostic contract, the mock adapter, and Paymob
configuration validation exist. The legacy Stripe order path is still the only
card checkout route. `PAYMENT_PROVIDER=paymob` now fails fast at boot when the
required variables are missing, but the Paymob adapter deliberately returns
`503` because session creation, status inquiry, and the HMAC field list are
blocked on confirmed Paymob endpoints/credentials (MVP-13/MVP-15). No endpoint,
payload, or signature field list is assumed.

### Checkout envelope (frozen)

Future card checkout responses use:

```json
{
  "orderId": "507f1f77bcf86cd799439011",
  "orderNumber": "CCTV-261116-0001",
  "paymentStatus": "pending",
  "redirectUrl": "https://provider.example/checkout/...",
  "provider": "mock"
}
```

`redirectUrl` is `null` when only a browser-side secret is returned.

### Provider interface

`src/module/payment/payment.types.ts` defines:

- `createSession(input)` — amount in integer minor units, currency, order
  number as the provider reference, line items, customer/billing data, callback
  URLs, and enabled integration IDs.
- `verifyAndParse(rawBody, headers)` — verifies the provider signature over the
  raw body before parsing. Invalid or missing signatures throw `401`.
- `fetchStatus(providerReference)` — authoritative inquiry.
- `refund?(input)` — optional and post-launch.

Provider statuses are `pending`, `paid`, `failed`, `expired`, and `cancelled`.
`paid` is terminal. A redirect or return URL never changes payment state.

### Mock provider (development only)

- Selected with `PAYMENT_PROVIDER=mock`.
- Returns a deterministic reference (`mock_<orderNumber>`) and a local redirect
  URL.
- `verifyAndParse` accepts only a body signed with the development mock secret;
  the signature is sent in the `x-mock-signature` header.
- `fetchStatus` answers from in-memory state.
- `NODE_ENV=production` with `PAYMENT_PROVIDER=mock` fails at boot.
- The mock proves the contract, not Paymob or any real payment method.

### Registry

`getPaymentProvider()` selects `mock`; `paymob` reports “not implemented yet” and
`stripe` remains the legacy order-path provider. An unknown `PAYMENT_PROVIDER`
fails at boot with the accepted values.

Env variables are documented in `config/.env.example`. Paymob values are
placeholders marked **UNCONFIRMED**; see
`docs/implementation/EXTERNAL_INTEGRATION_BLOCKERS.md`.

---

## Installation Requests

Authenticated. Installation statuses:

`PENDING`, `UNDER_REVIEW`, `SCHEDULED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`.

### `POST /v1/installation`

```json
{
  "orderId": "507f1f77bcf86cd799439011",
  "contactName": "Customer",
  "phone": "+966500000000",
  "address": "Street, Riyadh",
  "preferredDate": "2026-12-01T10:00:00.000Z",
  "notes": "Second floor"
}
```

The order must belong to the caller, must not be cancelled, and may have only one
installation request (`409` for a duplicate).

### `GET /v1/installation/mine`

Returns the caller's requests with order status/payment/total populated.

### `GET /v1/installation/admin`

Admin/SuperAdmin. Paginated, optional `status` filter.

### `PATCH /v1/installation/admin/:id`

Admin/SuperAdmin. Accepts `status`, `scheduledAt`, `adminNotes`. At least one
field is required. `scheduledAt` is required when setting status to `SCHEDULED`.
Cancelling clears the order's `installationRequested` flag.

### `GET /v1/installation/:id`

Owner or admin.

### `POST /v1/installation/:id/cancel`

Owner only. Allowed while status is `PENDING`, `UNDER_REVIEW`, or `SCHEDULED`.

---

## Contact

### `POST /v1/contact`

Public, rate-limited.

```json
{
  "name": "Customer",
  "email": "customer@example.com",
  "subject": "Question",
  "message": "Is this camera compatible?"
}
```

Sends an HTML-escaped email to `CONTACT_RECIPIENT_EMAIL` (falling back to
`EMAIL`). Returns `503` when no recipient is configured. SMTP failures surface
through the global error handler.

---

## Security Logs

### `GET /v1/security/logs`

SuperAdmin only. Reads the tail of `security.log`, newest first.

Query: `limit` (1-1000, default 200).

```json
{
  "message": "Security logs",
  "data": [/* parsed JSON log lines */],
  "total": 10
}
```

The response is limited to entries parsed from the last 5 MB of the file.
Malformed lines are skipped.

---

## Data Models

### User

`name`, `email` (unique, lowercase), `password` (bcrypt hash, hidden by default),
`role` (`user`/`admin`/`superAdmin`), `isActive` (for email/password accounts:
email verified), `isBlocked`, `googleId`, `imageURL`, `phone`, timestamps.

### Category

`en_name`, `ar_name`, `fr_name`, `imageURL`, `addedByEmail`, `isActive`,
timestamps. Virtual `subcategories`.

### Subcategory

`en_name`, `ar_name`, `fr_name`, `categoryId`, `addedByEmail`, `isActive`,
timestamps. Virtual `products`.

### Product

`en_name`, `ar_name`, `fr_name`, `en_description`, `ar_description`,
`fr_description`, `price`, `discount` (0-100), `brand` (optional, max 80),
`subcategoryId`, `addedByEmail`, `isActive`, timestamps.

Stored as JSON strings:

- `variants`: `[{ color, size, stock }]`
- `specifications`: `[{ keyEn, keyAr, valueEn, valueAr, unit }]` (max 40)
- `imageURLs`: `string[]`
- `colorImages`: `{ [color]: imageURL }`

### Bundle

`code` (unique), `en_name`, `ar_name`, `description`, `imageURLs`, `basePrice`,
`discount` (0-100), `cameras` (`[{ productId, color, size, quantity }]`),
`hddOptions` (`[{ code, labelEn, labelAr, priceDelta }]`),
`installationOptions` (`[{ code, labelEn, labelAr, priceDelta, city }]`),
`addedByEmail`, `isActive`, timestamps.

There is intentionally **no stock/availability field** yet: DEC-01 (bundle
inventory model) is unresolved. No component or HDD stock is deducted.

### Cart

`userId`, `productId`, `color`, `size`, `quantity`. Unique per
user + product + color + size.

### Wishlist

`userId`, `productId`. Unique per user + product.

### Order

`userId`, `items` (JSON snapshot array), `subtotal`, `shippingCost`,
`totalAmount`, `paymentMethod` (`cod`/`card`), `paymentStatus`, `paymentProvider`,
`paymentReference`, `orderStatus`, `shippingStatus`, `shippingCarrier`,
`trackingNumber`, `shippingAddress` (JSON object string), `installationRequested`,
`installationRequestId`, `idempotencyKey`, timestamps.

Indexes: user + created date, status fields, and a partial unique index on
user + idempotency key.

### InstallationRequest

`orderId` (unique), `userId`, `status`, `contactName`, `phone`, `address`,
`preferredDate`, `scheduledAt`, `notes`, `adminNotes`, timestamps.

---

## Security Behavior

- Passwords are hashed with bcrypt; rounds are read from `HASH` and clamped to
  8-15.
- JWTs are signed with role-specific secrets and carry a purpose `type`.
- Zod validates request bodies before controllers; unknown keys are preserved,
  known fields are coerced/trimmed.
- MongoDB operator keys (`$...`) and dotted keys are rejected in JSON bodies,
  query strings, and route params before routing.
- Helmet sets security headers; CORS uses `CORS_ORIGINS` when configured.
- Uploads are held in memory, limited in size/count, and validated by magic
  bytes (JPEG, PNG, GIF, WebP).
- Stripe webhooks are signature-verified. Card data is never accepted or stored.
- The mock payment adapter is development-only and is refused when
  `NODE_ENV=production`. Payment amounts cross the provider boundary as integer
  minor units; no card number, CVV, or expiry is ever stored.
- Password-reset tokens are single-use and require Redis.
- Access tokens are not revoked on password change; refresh tokens are stateless.
  Rotate the signing secrets to invalidate all issued tokens.
