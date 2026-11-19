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
| 429 | Rate limit or payment-sync debounce |
| 500 | Unhandled server/SMTP/provider error |
| 502 | Payment provider request failed |
| 503 | Optional integration is not configured (Google, Redis, contact recipient, Paymob) |

### Pagination and sorting

List endpoints that paginate accept `page` (1-based, default 1) and `limit`
(max 100). Product lists default to 10 per page; category lists to 20;
subcategory lists to 25; order admin lists to 50 and installation admin lists to
20.

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
| Payment methods | 60 / 60 s |
| Create/retry payment session | 10 / 60 s |
| Payment status | 60 / 60 s |
| Expiry sweep | 5 / 60 s |
| Payment sync | 10 / 60 s |
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

**Inventory note (DEC-01 resolved 2026-11-18).** A bundle has **no stock field**
of its own. Availability is derived from the component variants in `cameras`.
Checkout reserves those component quantities in the same transaction as the
order, so a bundle is never a separate stock-keeping unit. The public bundle
document omits `availability`; the cart response computes and returns it.

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
- `stock` and `availability` are not bundle fields. Availability is computed from
  the component variants at cart and checkout time.

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
configuration. Bundle availability is the minimum number of complete kits that
the current component stock can build. A bundle line reports the derived
`available` and `stock`, with `availabilityUnknown: false`; adding more kits than
the components can build returns `400`.

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
| `paymentStatus` | `pending`, `paid`, `failed`, `expired`, `cancelled`, `reconciliation_required` |
| `shippingStatus` | `pending`, `prepared`, `shipped`, `delivered`, `returned`, `cancelled` |

These are independent. A payment change never changes fulfilment or shipping.
Installation has its own workflow.

`paid` is terminal. `reconciliation_required` means money may have arrived after
the stock hold was released, or with a mismatched amount or currency. It is never
treated as paid by the normal settlement path; an admin must resolve it through
`POST /v1/order/admin/:id/reconcile-payment`.

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

- `items` must contain at least one active product or bundle line.
- `useCart: true` (or an omitted/empty `items` array) builds the order from the
  caller's stored cart. The cart is revalidated and re-priced at order time and is
  cleared only after a successful checkout response. A validation or stock failure
  leaves the cart untouched.
- Bundle items use `{ "itemType": "bundle", "bundleId", "hddOption",
  "installationOption", "quantity" }`. Explicit items and cart checkout may be
  mixed across lines but each request uses one mode.
- `paymentMethod` is `cod` or `card`.
- `paymentMethodCode` is optional and valid only with `paymentMethod: "card"`.
  Accepted values are `card`, `mada`, `apple_pay`, `tabby`, and `tamara`. The
  method must appear in `GET /v1/payment/methods`; the default is `card`.
  Sending `paymentMethodCode` with COD returns `400`.
- Prices and totals are calculated server-side; client prices are ignored.
- Stock is reserved in a MongoDB transaction. Product lines decrement their
  variant. Bundle lines decrement every component variant captured in the order
  snapshot, aggregated across the whole order.
- `installation` is optional. When present, an installation request is created
  for `cod` orders immediately, and for `card` orders after the payment session
  is created successfully.
- `idempotencyKey` is optional. Repeating the same key for the same user returns
  the existing order with `200` instead of creating a duplicate or clearing the
  cart again.
- MongoDB must run as a replica set or a sharded cluster (mongos). The server
  verifies the topology at boot and refuses to start against a standalone
  `mongod`.
- Every new order receives a unique `orderNumber` in the form
  `CCTV-YYMMDD-XXXX`. Legacy rows without one are serialized with a
  display-only `CCTV-LEGACY-XXXXXXXX` fallback.
- Card orders receive `expiresAt = createdAt + PAYMENT_ORDER_TTL_MINUTES`. COD
  orders have no payment deadline.

`cod` response: `201`

```json
{ "message": "Order created", "data": { /* order, including orderNumber */ } }
```

`card` response: `201`

```json
{
  "message": "Redirect to payment",
  "data": {
    "url": "https://accept.paymob.com/unifiedcheckout/?publicKey=...&clientSecret=...",
    "redirectUrl": "https://accept.paymob.com/unifiedcheckout/?publicKey=...&clientSecret=...",
    "provider": "paymob",
    "orderId": "507f1f77bcf86cd799439011",
    "orderNumber": "CCTV-261119-AB12",
    "currency": "SAR",
    "paymentStatus": "pending"
  }
}
```

Send the customer to `redirectUrl`. `url` is retained as an alias for older
storefront clients. The response never contains the Paymob secret key, API key,
HMAC secret, or intention client secret.

A disabled or unknown `paymentMethodCode` is rejected with `400` before the order
is written. If Paymob cannot create a session after the order is written, the
order is cancelled, its reserved stock is restored exactly once, no installation
request is created, and the response is a safe error:

- `503` — Paymob is not configured.
- `502` — Paymob was reached but the request or response failed.

### `GET /v1/order/mine`

Authenticated. Returns the caller's orders newest first:

```json
{ "message": "Orders", "data": { "orders": [], "currency": "SAR" } }
```

### `GET /v1/order/admin`

Admin/SuperAdmin. Paginated and filterable.

Query parameters:

| Parameter | Values |
|-----------|--------|
| `page` | integer, default `1` |
| `limit` | integer, default `50`, max `100` |
| `orderStatus` | one of the `orderStatus` values |
| `paymentStatus` | one of the `paymentStatus` values |
| `shippingStatus` | one of the `shippingStatus` values |
| `sort` | `createdAt`, `-createdAt`, `totalAmount`, `-totalAmount` |

An unknown status or sort value returns `400`. The response includes `orders`,
`total`, `page`, `limit`, and `currency`; totals reflect the active filters.

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
| `paymentStatus` | `pending → paid/failed/expired/cancelled/reconciliation_required`, `failed → paid/cancelled/reconciliation_required`, `expired → paid/cancelled/reconciliation_required`, `cancelled → reconciliation_required`, `reconciliation_required → paid/cancelled` | `paid` |
| `shippingStatus` | `pending → prepared/shipped/delivered/cancelled/returned`, `prepared → shipped/delivered/cancelled/returned`, `shipped → delivered/cancelled/returned` | `delivered`, `returned`, `cancelled` |

An illegal transition returns `400` and changes nothing. Marking an order `paid`
through this endpoint requires a non-empty `reason`. It is also refused with `409`
when the stock hold was released or the payment is already `expired`, `cancelled`,
or `reconciliation_required`; use the reconcile endpoint in those cases. Every
accepted change appends `{ at, actor, actorId, field, from, to, reason }` to
`statusHistory`.

Moving `orderStatus` into `cancelled` restores reserved product and bundle-
component stock exactly once, guarded by `stockReleasedAt`. A paid order is never
restocked.

### `GET /v1/order/:id`

Owner or admin. Returns the order with parsed `items` and `shippingAddress`.
Another user's order returns `404`.

### `GET /v1/order/:id/tracking`

Owner or admin. Returns the customer-facing tracking projection:

```json
{
  "message": "Order tracking",
  "data": {
    "orderNumber": "CCTV-261119-AB12",
    "orderStatus": "processing",
    "paymentStatus": "paid",
    "shippingStatus": "shipped",
    "shippingCarrier": "SMSA",
    "trackingNumber": "TRACK-123",
    "estimatedDelivery": null,
    "currency": "SAR",
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

Events are chronological. Actor ids, admin reasons, provider references, and
admin-only fields are excluded. `estimatedDelivery` is currently always `null`;
shipping data is returned as `null` when unset, not as an error.

### `GET /v1/order/track/:orderNumber`

Owner only. Same response shape as `/v1/order/:id/tracking`. A missing order and
another user's order both return `404`.

### `POST /v1/order/admin/expire-sweep`

Admin/SuperAdmin. Releases the stock hold for expired unpaid card orders. There is
no cron; call this endpoint periodically or rely on lazy expiry during order and
payment reads.

```json
{ "limit": 50 }
```

`limit` is optional, default `50`, max `200`. Response:

```json
{ "message": "Expiry sweep complete", "data": { "scanned": 12, "expired": 12 } }
```

Expiry is idempotent. An order that was already expired or cancelled is skipped,
and stock is released exactly once. Repeat the sweep while `scanned` equals the
requested limit.

### `POST /v1/order/admin/:id/sync-payment`

Admin/SuperAdmin. Asks Paymob for the authoritative state of a card payment and
applies it through the same settlement path as the webhook. Use it when a callback
is delayed or missing.

Response when a state change is applied:

```json
{
  "message": "Payment sync complete",
  "data": {
    "changed": true,
    "result": "applied",
    "paymentStatus": "paid"
  }
}
```

- An order already `paid` returns `changed: false`, `result: "duplicate"`.
- No provider transaction yet returns `changed: false`, `result: "pending"` and
  records `lastPaymentSyncAt`.
- A provider error returns `502` and leaves local state unchanged.
- Repeated calls within 10 seconds return `429`.
- A COD order or an order with no provider reference returns `409`.

### `POST /v1/order/admin/:id/reconcile-payment`

Admin/SuperAdmin. The only endpoint allowed to resolve a late or mismatched
payment.

```json
{
  "resolution": "paid",
  "reason": "Late payment confirmed in the Paymob dashboard",
  "reacquireStock": true
}
```

- `resolution` is `paid` or `cancelled`.
- `reason` is required and must be at least 3 characters.
- `reacquireStock` is required when marking `paid` after the stock hold was
  released. Stock is reserved again in the same transaction; if component stock
  is no longer available, the request fails and the order stays unchanged.
- A paid order cannot be cancelled through this endpoint.
- Cancelling releases stock once if it is still held.
- Every resolution appends a `statusHistory` entry with the admin actor and
  reason.

Returns `200` with the updated order.

### `GET /v1/payment/methods`

Public. Returns the methods the merchant has activated plus COD. Integration IDs,
keys, and secrets are never returned.

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

When Paymob is not fully configured, the endpoint still succeeds with
`methods: []` and `cod: true`. When no provider is selected, `provider` is `null`.
A method appears only when it is in `PAYMOB_METHODS_ENABLED` and has a configured
integration ID. Apple Pay, Tabby, and Tamara never appear by default.

### `POST /v1/payment/session`

Authenticated. Creates or retries a hosted checkout for an existing pending card
order. Amounts are always read from the stored order; the request cannot supply a
price.

```json
{
  "orderNumber": "CCTV-261119-AB12",
  "method": "card"
}
```

`method` is optional; the default is `card`. It must be enabled.

Returns `200`:

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

Errors:

| Status | Meaning |
|--------|---------|
| `400` | Unknown or disabled payment method |
| `404` | Order not found or not owned by the caller |
| `409` | Order is not a card order, payment window elapsed, payment is no longer `pending`, or the stock hold was released |
| `429` | Session creation rate limit |
| `502` | Paymob request failed |
| `503` | Paymob is not configured |

A retry never changes the order total. If the order has expired or its stock hold
was released, create a new order.

### `GET /v1/payment/status/:orderNumber`

Owner or admin. Returns only the stored payment state. Query-string parameters such
as `?success=true` are ignored and can never mark an order paid. Another user's
order returns `404`. Reads may apply lazy expiry to an abandoned card order.

```json
{
  "message": "Payment status",
  "data": {
    "orderNumber": "CCTV-261119-AB12",
    "paymentStatus": "pending",
    "paymentMethod": "card",
    "currency": "SAR",
    "nextAction": "complete_payment"
  }
}
```

`nextAction` values:

| Value | Meaning |
|-------|---------|
| `none` | Paid or cancelled; no payment action |
| `complete_payment` | Pending card order; finish the hosted checkout |
| `await_confirmation` | Pending COD order; payment is collected on delivery |
| `contact_support` | Failed, expired, or reconciliation required |

The response never includes `paymentReference`, provider secrets, or raw provider
payloads.

### `POST /v1/payment/paymob/webhook`

Public Paymob transaction callback. Paymob signs the exact received bytes, so this
route is mounted before the JSON body parser and reads the raw body.

```text
POST {BASE_URL}/v1/payment/paymob/webhook?hmac=<signature>
Content-Type: application/json
```

- The signature is HMAC-SHA512 over the documented 20 transaction fields,
  concatenated in order with no separator, lower-case hex. Missing or invalid
  signatures return `401` and change nothing.
- The body is parsed only after verification.
- The event is deduplicated by `{ provider, providerTransactionId }` in the payment
  ledger. A retry returns `200` with `result: "duplicate"` and no side effects.
- A successful amount or currency mismatch is recorded as
  `reconciliation_required`, never `paid`.
- A payment that succeeds after the stock hold was released is also recorded as
  `reconciliation_required`.
- Unknown order numbers are recorded in the ledger and acknowledged with `200`;
  this prevents infinite provider retries.

Response:

```json
{ "received": true, "result": "applied", "changed": true }
```

`400` means the body was unreadable, `401` means the signature was missing or
invalid, and `5xx` means local persistence failed. Paymob may retry a `5xx`.

---

## Payment Provider Contract

**Status:** Paymob is the only online provider. `PAYMENT_PROVIDER` must be
`paymob` or the development-only `mock`; there is no Stripe adapter, dependency,
webhook, or rollback option. Region separation is explicit and mandatory.

The order flow resolves one adapter through `getPaymentProvider()` and never
imports a provider SDK. Paymob configuration is validated when a Paymob operation
runs, so COD-only deployments boot without Paymob credentials. A card attempt
with missing or inconsistent configuration returns `503` before any money is
taken.

### Checkout envelope (frozen)

Card checkout responses use:

```json
{
  "orderId": "507f1f77bcf86cd799439011",
  "orderNumber": "CCTV-261119-AB12",
  "paymentStatus": "pending",
  "redirectUrl": "https://accept.paymob.com/unifiedcheckout/?publicKey=...&clientSecret=...",
  "provider": "paymob"
}
```

`redirectUrl` is `null` only if a provider returns no browser redirect. The Paymob
adapter does not return a browser-side secret to API clients; it embeds the
intention client secret in the checkout URL server-side.

### Provider interface

`src/module/payment/payment.types.ts` defines:

- `createSession(input)` — amount in integer minor units, currency, order number
  as the provider special reference, line items, customer/billing data, callback
  URLs, and the selected integration ID.
- `verifyAndParse(rawBody, headers, query)` — verifies the provider signature over
  the raw body before parsing. Invalid or missing signatures throw `401`.
- `fetchStatus(providerReference)` — authoritative inquiry.
- `refund?(input)` — optional and not implemented.

Provider statuses are `pending`, `paid`, `failed`, `expired`, `cancelled`, and
`reconciliation_required`. `paid` is terminal. A redirect or return URL never
changes payment state.

### Paymob adapter

Implemented against Paymob's Intention API and Unified Checkout:

1. `POST {PAYMOB_BASE_URL}/v1/intention/` with
   `Authorization: Token <PAYMOB_SECRET_KEY>` creates an intention and returns
   `id`, `intention_order_id`, and `client_secret`.
2. The customer is redirected to
   `{PAYMOB_CHECKOUT_URL}/?publicKey=<PAYMOB_PUBLIC_KEY>&clientSecret=<client_secret>`.
3. Paymob posts the transaction callback to the notification URL with
   `?hmac=<signature>`.
4. `fetchStatus` uses Paymob's inquiry API (API key exchanged for a short-lived
   token) as the pull-based confirmation path.

`PAYMOB_BASE_URL` defaults to `https://accept.paymob.com` for `eg` and
`https://ksa.paymob.com` for `ksa`. `PAYMOB_CHECKOUT_URL` defaults to
`{base}/unifiedcheckout`. A configured URL with a different origin is rejected.
The key-prefix checks reject Egypt credentials on the KSA host and test keys in
live mode.

The intention payload uses `amount` in integer minor units, `currency` in upper
case, `special_reference` equal to the order number, one `payment_methods`
integration ID, item lines from the stored order snapshot, a separate shipping
line, billing data derived from the shipping address, `notification_url`, and
`redirection_url`.

The inquiry response is mapped to the same `VerifiedPaymentEvent` used by the
webhook. The webhook path and the inquiry path therefore share one settlement
decision function.

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

`getPaymentProvider()` selects `paymob` or `mock`. An unknown
`PAYMENT_PROVIDER` fails at boot with the accepted values. A missing value in
production fails at boot; in development it leaves card checkout disabled with
`503` while COD continues to work.

Env variables are documented in `config/.env.example`. Paymob sandbox and KSA
verification status is tracked in
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

There is intentionally **no bundle stock field**. Checkout reserves the variants
listed in `cameras`; availability is derived from those variants.

### Cart

Product line: `userId`, `itemType` (`product`), `productId`, `color`, `size`,
`quantity`. Unique per user + product + color + size.

Bundle line: `userId`, `itemType` (`bundle`), `bundleId`, `hddOption`,
`installationOption`, `quantity`. Unique per user + bundle + option pair.

### Wishlist

`userId`, `productId`. Unique per user + product.

### Order

`userId`, `orderNumber` (unique for new orders), `items` (JSON snapshot array),
`subtotal`, `shippingCost`, `totalAmount`, `paymentMethod` (`cod`/`card`),
`paymentStatus`, `paymentProvider`, `paymentReference`, `paymentIntentionId`,
`lastPaymentSyncAt`, `expiresAt`, `orderStatus`, `shippingStatus`,
`shippingCarrier`, `trackingNumber`, `shippingAddress` (JSON object string),
`installationRequested`, `installationRequestId`, `idempotencyKey`,
`statusHistory`, `stockReleasedAt`, `stockReacquiredAt`, `paymentAttempts`,
timestamps.

Indexes: user + created date, status fields, `paymentMethod + paymentStatus +
expiresAt`, `paymentReference`, a unique partial index on `orderNumber`, and a
unique partial index on user + idempotency key.

### PaymentTransaction

Payment ledger row written by webhook and inquiry settlement. Fields:
`orderId` (null for an unknown order), `orderNumber`, `provider`,
`providerTransactionId` (unique with `provider`), `intentionId`, `amountMinor`,
`currency`, `status`, `success`, `hmacVerified`, `source`
(`webhook`/`inquiry`/`session`/`admin`), `result`, `reason`, `payloadDigest`,
`processedAt`, timestamps.

The unique `{ provider, providerTransactionId }` index is the replay guard.
Raw provider payloads are not stored; `payloadDigest` is a short SHA-256 digest.

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
- Paymob webhooks are HMAC-SHA512 verified over the raw body before parsing.
  Card data is never accepted or stored.
- Payment amounts cross the provider boundary as integer minor units; no card
  number, CVV, or expiry is ever stored.
- Paymob region, base URL, checkout URL, and credentials are cross-checked; a
  cross-region or test/live mismatch is rejected.
- The mock payment adapter is development-only and is refused when
  `NODE_ENV=production`.
- Password-reset tokens are single-use and require Redis.
- Access tokens are not revoked on password change; refresh tokens are stateless.
  Rotate the signing secrets to invalidate all issued tokens.
