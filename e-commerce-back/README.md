# CCTV E-Commerce Backend

TypeScript + Express + MongoDB API for a CCTV equipment store. It supports product
and bundle purchases, cash on delivery (COD), hosted Paymob card checkout, and an
installation-request workflow that is independent of payment, fulfilment, and
shipping.

## Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js 24+ (LTS) |
| Language | TypeScript (ESM) |
| HTTP | Express 5 |
| Database | MongoDB with Mongoose 9 |
| Auth | JWT with role-scoped signing secrets, Passport Google OAuth 2.0 |
| Validation | Zod |
| Images | Cloudinary or local disk |
| Email | Nodemailer (SMTP) |
| Payments | Paymob Intention API + Unified Checkout; COD |
| Logging | Winston (`security.log`) |
| Tests | Jest + ts-jest |

Stripe is not a dependency and there is no Stripe adapter, webhook, or rollback
configuration. Paymob is the only online payment provider.

## Requirements

- Node.js 24 or newer
- MongoDB running as a replica set or sharded cluster (checkout, stock release,
  and payment settlement use transactions)
- Redis only if password reset must be available
- Optional: SMTP, Google OAuth, Cloudinary, a Paymob merchant account

## Setup

```bash
npm install
cp config/.env.example config/.env
```

Fill in `config/.env`. The four JWT secrets are required (`SIGNATURE_ADMIN`,
`SIGNATURE_USER`, `SIGNATURE_SUPER_ADMIN`, `VERIFY_SIGNATURE_MY`) and so is
`MONGODB_URI`; the process fails at startup when any of them is missing.

`MONGODB_URI` must point at a deployment that supports multi-document
transactions: Atlas `mongodb+srv://`, a sharded cluster, or a local single-node
replica set. A standalone `mongod` stops the process at boot with an explicit
topology error.

`PAYMENT_PROVIDER` is explicit:

- `paymob` — the only production online provider.
- `mock` — local development and tests only; refused when
  `NODE_ENV=production`.
- Unset — development boots with COD working and card checkout returning `503`.
  Production refuses to boot without an explicit value.

Paymob configuration is validated when a Paymob operation runs, not at boot, so a
COD-only deployment does not need Paymob values. `PAYMOB_REGION` is mandatory and
must be `eg` or `ksa`. The configured base URL, checkout URL, and key prefixes
must match that region; cross-region endpoints and credentials are rejected. The
region defaults in the docs are Egypt (`https://accept.paymob.com`) and Saudi
Arabia (`https://ksa.paymob.com`).

The `.env` file is resolved relative to the application code, so the process
working directory does not matter.

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start with `tsx --watch` |
| `npm run build` | Compile to `dist/` |
| `npm start` | Run the compiled `dist/src/index.js` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Jest unit tests |
| `npm run test:watch` | Jest in watch mode |
| `npm run lint` / `lint:fix` | ESLint |
| `npm run format` | Prettier over `src/**/*.ts` |

## Project Structure

```text
config/                 Environment loading and validation
src/
  app.controller.ts     Express middleware, route mounting, error handler
  index.ts              Startup entry point
  common/
    email/              SMTP sender
    middleware/         Auth, uploads, sanitization, logging
    utils/              Query building, pricing, money, rate limits, uploads
    validation/         Zod schemas and shared field/variant helpers
  database/
    model/              Mongoose models (order, payment ledger, bundle, ...)
    connection.ts       MongoDB connection and replica-set check
    redis.connection.ts Lazy Redis client
  module/
    auth/               Signup, login, Google OAuth, verification, reset
    user/               Profile and avatar
    category/           Public listing and admin CRUD
    subcategory/        Public listing and admin CRUD
    product/            Catalog, variants, images, pagination
    bundle/             Kits, options, server-side pricing
    cart/               Per-user cart (products and bundles)
    wishlist/           Per-user wishlist
    order/              Checkout, stock, expiry, tracking, reconciliation
    payment/            Paymob adapter, HMAC webhook, ledger, method gating
    installation/       Installation-request workflow
    contact/            Public contact form
    security/           Security-log viewer
```

## Authentication

All protected routes use the header format:

```http
Authorization: <role> <token>
```

`<role>` is `user`, `admin`, or `superAdmin`; it selects the signing secret.
`<token>` is the access token returned by login or Google OAuth.

- Access tokens and refresh tokens carry a `type` claim, so they cannot be
  replayed for each other.
- Email/password signup creates an inactive account and sends a verification
  link. Login is rejected until the email is verified.
- A super admin access token may request `role: "admin"` or `role: "superAdmin"`
  at signup. Public signup is always `user`.
- Google signup creates an active `user`; Google login links a Google ID to an
  existing email account on first use.
- Refresh tokens are exchanged at `POST /v1/auth/access-token`.
- Password reset uses single-use tokens stored in Redis and fails with `503`
  when Redis is unavailable.

## Business Rules

- Prices, discounts, stock checks, and totals are calculated server-side.
- Cart and order lines are identified by `productId + color + size` for products,
  and by `bundleId + hddOption + installationOption` for bundles.
- Checkout reserves stock inside a MongoDB transaction. Bundle sales reserve the
  components captured in the order snapshot. An optional `idempotencyKey`
  prevents duplicate order submissions.
- Order, payment, shipping, and installation statuses are independent.
- Installation requests can be created during checkout, or later through the
  installation endpoints. Card orders get the request only after the payment
  session is created successfully.
- Moving an order into `cancelled` restores its reserved stock exactly once,
  guarded by `stockReleasedAt`.
- Unpaid card orders hold stock for `PAYMENT_ORDER_TTL_MINUTES` (default 30).
  Expiry is applied lazily on order/payment reads and through the admin sweep
  endpoint; there is no cron or queue.
- Card payments use a server-created Paymob intention and Paymob's hosted
  Unified Checkout. The browser receives only a checkout redirect URL.
- A redirect or return-page query parameter never marks an order paid. Only an
  HMAC-verified Paymob webhook or an authenticated Paymob inquiry can settle a
  payment.
- `paid` is terminal. A late payment whose stock hold was already released is
  recorded as `reconciliation_required`; an admin must resolve it through the
  dedicated reconcile endpoint.
- Card data is never accepted or stored.

## API

The complete endpoint reference is in [API_DOCUMENTATION.md](API_DOCUMENTATION.md).
Frontend checkout, return-page, polling, and tracking guidance is in
[docs/FRONTEND_INTEGRATION.md](docs/FRONTEND_INTEGRATION.md). Day 5/6 status,
verification evidence, and external blockers are in
[docs/DAY5_DAY6_DELIVERY_REPORT.md](docs/DAY5_DAY6_DELIVERY_REPORT.md).

The API prefix is `/v1`; `GET /v1/health` returns
`{ "status": "ok", "currency": "SAR" }` by default.

## Environment Variables

See [config/.env.example](config/.env.example) for the full list. Groups:

- Runtime: `NODE_ENV`, `PORT`, `BASE_URL`, `FRONTEND_URL`, `CORS_ORIGINS`,
  `TRUST_PROXY`, `JSON_BODY_LIMIT`
- Database: `MONGODB_URI`, `REDIS_URL`
- JWT: `SIGNATURE_ADMIN`, `SIGNATURE_USER`, `SIGNATURE_SUPER_ADMIN`,
  `VERIFY_SIGNATURE_MY`, `ACCESS_TOKEN`, `REFRESH_TOKEN`, `HASH`
- Email: `EMAIL`, `PASSWORD`, `EMAIL_FROM_NAME`, `SMTP_HOST`, `SMTP_PORT`,
  `SMTP_SECURE`, `CONTACT_RECIPIENT_EMAIL`
- OAuth: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- Images: `Image_TYPE`, `CLOUDINARY_NAME`, `CLOUDINARY_KEY`,
  `CLOUDINARY_SECRET`, `SERVER`
- Pricing: `CURRENCY`, `SHIPPING_COST_TYPE`, `SHIPPING_COST_VALUE`
- Payments: `PAYMENT_PROVIDER`, `PAYMENT_ORDER_TTL_MINUTES`
- Paymob: `PAYMOB_REGION`, `PAYMOB_ENV`, `PAYMOB_API_KEY`, `PAYMOB_SECRET_KEY`,
  `PAYMOB_PUBLIC_KEY`, `PAYMOB_HMAC_SECRET`, `PAYMOB_BASE_URL`,
  `PAYMOB_CHECKOUT_URL`, `PAYMOB_INTEGRATION_ID_CARD`,
  `PAYMOB_INTEGRATION_ID_MADA`, `PAYMOB_INTEGRATION_ID_APPLE_PAY`,
  `PAYMOB_INTEGRATION_ID_TABBY`, `PAYMOB_INTEGRATION_ID_TAMARA`,
  `PAYMOB_METHODS_ENABLED`

`config/.env.example` contains placeholders only. Never commit
`config/.env` or real provider credentials.

## Testing

```bash
npm run typecheck
npm test
npm run lint
```

The Jest suite covers pricing, money conversion, query building, variant
normalization, JWT purpose scoping, request schemas, bundle totals, Paymob
configuration, intention payload construction, HMAC verification, method gating,
payment settlement rules, expiry eligibility, stock aggregation, and tracking
projection. It uses no database and no real Paymob request.

The Cypress specs under `cypress/` are legacy and are not part of `npm test`.
There are no automated HTTP/DB integration tests in the repository.

## Payment Verification Status

- Unit-tested with mocked Paymob HTTP responses: intention creation, HMAC
  verification, inquiry parsing, method gating, settlement decisions.
- Not tested against a real Paymob sandbox transaction: no completed payment,
  no real callback, no public HTTPS webhook URL.
- Not tested in Saudi Arabia: no KSA merchant credentials or account.
- Apple Pay, Tabby, and Tamara are disabled until merchant activation is
  confirmed.

See [docs/implementation/EXTERNAL_INTEGRATION_BLOCKERS.md](docs/implementation/EXTERNAL_INTEGRATION_BLOCKERS.md)
for the current blocker list.

## Known Limitations

- No completed Paymob sandbox or KSA end-to-end payment exists. Mock tests prove
  the contract, not the provider.
- The webhook requires a public HTTPS URL; local testing can only verify the HMAC
  and handler logic with signed fixtures.
- Refund and void operations are manual through the Paymob dashboard. There is no
  refund automation endpoint.
- Unpaid-order expiry has no scheduler; it runs on reads and on an admin-triggered
  sweep.
- Refresh tokens are stateless and cannot be revoked; there is no logout endpoint.
- Rate limiting uses an in-memory store and is per process.
- No technician assignment or scheduling system beyond installation status and
  `scheduledAt`.
- Security-log viewing reads a local `security.log`, so it is not suitable for
  multi-instance deployments without shared log storage.
- Bundle availability is derived from component variants at read/checkout time;
  there is no independent bundle stock counter.
