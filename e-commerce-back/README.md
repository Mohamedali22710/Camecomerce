# CCTV E-Commerce Backend

TypeScript + Express + MongoDB API for a CCTV equipment store. It supports product
purchases and an installation-request workflow that is independent of payment,
order fulfillment, and shipping.

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
| Payments | Stripe Checkout (temporary card provider) |
| Logging | Winston (`security.log`) |
| Tests | Jest + ts-jest |

## Requirements

- Node.js 24 or newer
- MongoDB running as a replica set (checkout uses transactions)
- Redis only if password reset must be available
- Optional: SMTP, Google OAuth, Cloudinary, Stripe

## Setup

```bash
npm install
cp config/.env.example config/.env
```

Fill in `config/.env`. The four JWT secrets are required (`SIGNATURE_ADMIN`,
`SIGNATURE_USER`, `SIGNATURE_SUPER_ADMIN`, `VERIFY_SIGNATURE_MY`) and so is
`MONGODB_URI`; the process fails at startup when any of them is missing.
Checkout and stock release use multi-document transactions, so `MONGODB_URI` must
point at a replica set or a sharded cluster (Atlas `mongodb+srv://`, or a local
single-node replica set). A standalone `mongod` now stops the process at boot
with an explicit topology error.

`PAYMENT_PROVIDER` is explicit: production must set `paymob` or `stripe`.
Development may use `mock`; in development, leaving the variable unset still
boots (COD works) and card checkout returns `503` until a provider is configured.
Paymob credentials are checked when a Paymob operation runs, not at boot, so
COD-only deployments need no Paymob values. The `.env` file is located relative
to the application code, so the process working directory does not matter.

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
    utils/              Query building, pricing, rate limits, uploads
    validation/         Zod schemas and shared field/variant helpers
  database/
    model/              Mongoose models
    connection.ts       MongoDB connection
    redis.connection.ts Lazy Redis client
  module/
    auth/               Signup, login, Google OAuth, verification, reset
    user/               Profile and avatar
    category/           Public listing and admin CRUD
    subcategory/        Public listing and admin CRUD
    product/            Catalog, variants, images, pagination
    cart/               Per-user cart
    wishlist/           Per-user wishlist
    order/              Checkout, stock, statuses, Stripe webhook
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
- Cart and order lines are identified by `productId + color + size`; blank
  variant labels normalize to `Default`.
- Checkout reserves stock inside a MongoDB transaction. An optional
  `idempotencyKey` prevents duplicate order submissions.
- Order, payment, shipping, and installation statuses are independent.
- Installation requests can be created during checkout, or later through the
  installation endpoints. Card orders get the request only after the payment
  session is created successfully.
- Moving an order into `cancelled` restores its reserved stock (subject to the
  concurrency limitation noted below).
- Card payments use Stripe Checkout. The webhook verifies the provider signature
  and updates payment fields only. Card data is never stored.
- If Stripe is not configured, card checkout returns `502`, the order is
  cancelled with stock restored, and no installation request is created.

## API

The complete endpoint reference is in [API_DOCUMENTATION.md](API_DOCUMENTATION.md).
The API prefix is `/v1`; `GET /v1/health` returns `{ "status": "ok", "currency": "SAR" }`
by default.

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
- Payments: `PAYMENT_PROVIDER`, `Secret_key_Stripe`, `STRIPE_WEBHOOK_SECRET`

## Testing

```bash
npm test
```

The Jest suite covers pricing, query building, variant normalization, JWT
purpose scoping, and request-schema behavior. It does not require a database.
There are no automated HTTP/DB integration tests in the repository. The Cypress
specs under `cypress/` are legacy and are not part of `npm test`.

## Known Limitations

- Stripe is the only implemented card provider; Moyasar/Tap are not integrated.
- Expired or failed Stripe sessions mark the payment as failed but do not cancel
  the order or restore stock automatically.
- Refresh tokens are stateless and cannot be revoked; there is no logout endpoint.
- Rate limiting uses an in-memory store and is per process.
- No technician assignment or scheduling system beyond installation status and
  `scheduledAt`.
- Security-log viewing reads a local `security.log`, so it is not suitable for
  multi-instance deployments without shared log storage.
- Order cancellation restores stock with a read-then-write check; two concurrent
  cancellations could restore it twice. An atomic status transition is the
  recommended fix.
