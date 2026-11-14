# Backend Audit and Cleanup — CCTV E-Commerce

**Repository:** `D:\freelance\e-commerce-back`
**Audit date:** 2026-11-15
**Stack:** Node.js 24+, TypeScript (ESM), Express 5, MongoDB/Mongoose 9
**Scope:** Consolidate the audit required by `BACKEND_CODE_AUDIT_CCTV.md` for the
backend as it stands after the initial cleanup and the continuation work. The
file-by-file record of the initial cleanup is in
[OPENCODE_CHANGE_REPORT.md](OPENCODE_CHANGE_REPORT.md); this document describes
the final state, the continuation changes, and the remaining risks.

> Verification policy: a claim is marked **verified** only when it was checked by
> a command or a runtime request. Statements based only on reading the source are
> marked **inspected**. Unconfigured integrations are listed as **not tested**.

---

## A. Original Architecture

The delivered backend was a modular monolith. Every feature followed the same
vertical slice, and no feature bypassed the shared request pipeline.

```text
HTTP request
  -> src/index.ts (assert env, start server, connect MongoDB)
  -> src/app.controller.ts (CORS, Helmet, compression, body parsing,
     sanitization, routes, 404, centralized error handler)
  -> module/<feature>/<feature>.controller.ts (Router: auth -> role check ->
     upload -> validation -> handler)
  -> module/<feature>/<feature>.service.ts (business logic, Mongoose calls)
  -> src/database/model/*.model.ts (Mongoose schemas)
  -> MongoDB
```

Cross-cutting code lived in:

- `config/env.service.ts` — one typed configuration object plus `assertEnv()`.
- `src/common/middleware/` — JWT auth, sanitization, logging, Multer.
- `src/common/utils/` — `HttpError`, query building, pricing, rate limiting,
  upload helpers, Zod validation middleware.
- `src/common/validation/` — shared field, ObjectId, and product-variant rules.
- `src/database/` — MongoDB connection and a lazy, optional Redis client.

Authentication used JWTs signed with a role-specific secret. The
`Authorization` header carried both values: `Authorization: <role> <token>`.
Roles were `user`, `admin`, and `superAdmin`. Payment, order, shipping, and
installation were separate concerns; installation was introduced as its own
model and module rather than a field on the payment flow.

At the start of the continuation work the project already compiled, had 20
Node-test-runner tests, and had a working API, but it still used Joi, an older
Node engine floor, and documentation that no longer matched the code.

---

## B. Feature Audit

Status values describe the state at the start of the continuation work.

| Feature / Module | Original Status | Decision | Reason | Changes Made |
| ---------------- | --------------- | -------- | ------ | ------------ |
| MongoDB connection and Mongoose models | Working | KEEP | Core persistence | None |
| Email/password auth with JWT | Working | KEEP | Core account flow | Zod validation; password hidden by default |
| Role-based access control | Working | KEEP | Admin/customer separation | None |
| Google OAuth 2.0 | Present, optional | KEEP | Useful alternate login | Profile response no longer leaks `googleId` |
| Email verification | Working, SMTP-dependent | KEEP | Prevents unverified accounts | None |
| Password reset | Working, Redis-dependent | KEEP | Required account flow | Documented fail-closed `503` |
| User profile and avatar | Working | KEEP | Customer account management | Zod validation |
| Category CRUD | Working | KEEP | Catalog hierarchy | Zod validation |
| Subcategory CRUD | Working | KEEP | Catalog hierarchy | Zod validation |
| Product CRUD, images, variants | Working | KEEP | Core catalog | Zod validation; empty-category pagination fix; upload error mapping |
| Product search/filter/sort/pagination | Working | MODIFY | Unsupported sort fields were accepted | Enforced field/direction allow-list |
| Cart | Working | KEEP | Checkout prerequisite | Zod validation |
| Wishlist | Working | OPTIONAL / RETAIN | Small, complete, isolated feature | None |
| COD checkout | Working | KEEP | Primary local payment method | Installation created once, inside the request |
| Card checkout (Stripe) | Present, optional | KEEP / MODIFY | Temporary card provider; Saudi provider planned | Stock restored and order cancelled when session creation fails |
| Order status management | Working | KEEP | Fulfilment workflow | Zod validation |
| Stock reservation | Working, transaction-based | KEEP | Prevents overselling | Restore path verified for failed card session |
| Idempotent order submission | Working | KEEP | Prevents duplicate orders | Verified with repeated key |
| Installation request workflow | Working | KEEP / MODIFY | Required business workflow | Created only after a successful card session; failed session clears the flag |
| Contact form | Working, SMTP-dependent | KEEP | Customer communication | Zod validation |
| Security-log viewer | Working | KEEP | Super-admin diagnostics | None |
| Rate limiting | Working, in-memory | KEEP | Abuse reduction | None |
| Validation layer | Joi | MODIFY | Roadmap required Zod; one validation system | All schemas migrated to Zod |
| Automated tests | 20 `node:test` tests | MODIFY | Roadmap required Jest | Migrated to Jest; 54 tests |
| API documentation | Stale | MODIFY | Described removed flows and fields | Rewritten against the code |
| Environment template | Stale | MODIFY | Missing variables and wrong names | Rewritten |
| Cypress E2E | Legacy | OPTIONAL / RETAIN | Not part of the release gate | Not run; left untouched |
| PayPal, S3, Facebook login, BullMQ, cron, OTP, i18n, metrics | Removed before continuation | REMOVE | No implementation or business need | Confirmed absent |
| Moyasar/Tap integration | Absent | OPTIONAL / FUTURE | Initial release can use COD; Stripe is temporary | Not implemented |
| Technician assignment/scheduling | Absent | OPTIONAL / FUTURE | Beyond initial installation-request workflow | Not implemented |

---

## C. Removed Files and Dependencies

### C.1 Removed in the initial cleanup

These removals are recorded in [OPENCODE_CHANGE_REPORT.md](OPENCODE_CHANGE_REPORT.md)
and were verified absent from the current tree.

| Item | Why removal was safe |
| ---- | -------------------- |
| `API_DOCUMENTATION.pdf` | Binary duplicate of the Markdown document |
| `json.json` | Scratch data with no runtime role |
| `security.json`, committed `security.log` | Runtime artifacts, not source |
| `src/main.ts` | Alternate entrypoint not referenced by `package.json` |
| `src/common/middleware/blocklist.ts` | In-memory permanent IP ban replaced by rate limiting |
| `src/common/middleware/detectInjection.ts` | False-positive value matching replaced by operator-key sanitization |
| `src/module/wishlist/wishlist.validate.ts` | Unused; wishlist validates in the service path |
| Unused runtime packages (PayPal, AWS S3, Facebook, BullMQ, cron, OTP, i18n, metrics, session store, unused image/currency libraries) | No matching implementation remained |
| Unused dev packages (Jest stack, nodemon, supertest, stale type packages) | Replaced by the tooling that was actually in use at that time |

### C.2 Removed or replaced in the continuation

| Item | Replacement | Why safe |
| ---- | ----------- | -------- |
| `joi` | `zod` | Every schema and the validation middleware were migrated; no Joi import remains |
| `assertObjectId()` helper | `objectIdSchema` | The helper had no remaining caller after the Zod migration |
| `tsx --test` test script | Jest | The three existing suites were converted and expanded; no test file was lost |

`zod`, `jest`, `ts-jest`, and `@types/jest` were re-added because they are now
used by production validation and by the test runner. No other dependency was
installed.

Nothing else was deleted. `generate_module.py` and the Cypress suite remain in
the repository as legacy tooling; they are not part of the build or test path.

---

## D. Retained Features

The retained set covers the initial release:

- **Catalog:** multilingual categories, subcategories, products, per-color
  images, free-form color/size variants, and per-variant stock.
- **Accounts:** email/password and Google login, email verification, password
  reset, profile updates, avatar upload, and three roles.
- **Shopping:** cart, wishlist, server-side pricing, shipping cost, COD and card
  checkout, stock reservation, and idempotent order creation.
- **Fulfilment:** independent order, payment, and shipping statuses; admin
  status updates; stock restoration on cancellation.
- **Installation:** a separate request model with its own status workflow and
  owner/admin access rules.
- **Operations:** contact email, rate limiting, sanitization, structured error
  responses, security logs, and graceful shutdown.
- **Optional infrastructure:** Redis for single-use reset tokens, SMTP, Google
  OAuth, Cloudinary or local image storage, and Stripe Checkout.

Wishlist is not required by the initial brief, but it is small, self-contained,
and does not complicate the core flows, so it was retained rather than removed.

---

## E. Modified Features

### E.1 Continuation changes

| Area | Change | Reason |
| ---- | ------ | ------ |
| Runtime | `engines.node` raised from `>=20` to `>=24` | Current LTS line; verified on Node 26.12.1 |
| Validation | All `*.validate.ts`, `objectId.ts`, `variant.ts`, and `validate.ts` migrated to Zod | One validation library; typed inference; roadmap requirement |
| Validation helpers | Added `fields.ts` (email/phone/password) and `coercion.ts` (multipart boolean/JSON-array coercion) | Remove repeated rules and preserve multipart behavior |
| Unknown fields | Schemas use `z.looseObject` | Preserve Joi's `allowUnknown` behavior and avoid breaking existing clients |
| Tests | Jest + ts-jest configuration; 7 suites / 54 tests | Roadmap requirement; broader coverage than the original 20 tests |
| TypeScript | `**/*.test.ts` excluded from the build | Tests are not shipped in `dist/` |
| ESLint | Removed the type-aware parser project setting | Tests are outside the build project; `npm run typecheck` owns type checking |
| Orders | Card session failure now cancels the order, restores stock, and clears `installationRequested`/`installationRequestId` | A failed checkout must not hold stock or claim an installation |
| Orders | Installation is created immediately for COD and only after a successful card session | No orphan installation request for an unpaid checkout |
| Products | Empty category now returns an empty paginated list instead of a misleading 404 | A valid category with no products is not an error |
| Products | Sort fields restricted to `price`, `en_name`, `ar_name`, `fr_name`, `createdAt` | The previous check accepted unsupported fields |
| Products | Upload errors map to `400`; product creation supports an image array | Prevent unhandled Multer/storage errors |
| Users | Password has `select: false`; profile excludes `googleId` | Prevent credential/identifier leakage |
| Docs | `README.md`, `API_DOCUMENTATION.md`, and `config/.env.example` rewritten | They described removed flows and variables |

### E.2 Earlier cleanup changes that remain relevant

The initial cleanup already introduced `HttpError`, centralized error handling,
operator-key sanitization, purpose-scoped JWTs, role-scoped secrets, memory
uploads with magic-byte validation, query allow-lists, transaction-based
checkout, and the installation module. Those changes were retained and were not
reverted.

---

## F. Current Backend Architecture

```text
config/
  env.service.ts        Typed environment loading + required-secret check
  .env.example          Committed template (no real secrets)
src/
  index.ts              assertEnv -> listen -> connect MongoDB -> graceful shutdown
  app.controller.ts     Middleware order, health, route mounting, error handler
  common/
    email/              Nodemailer sender
    middleware/         auth, multer, sanitize, logger
    utils/              httpError, pricing, buildQuery, rateLimit, uploadImage,
                        validate (Zod middleware), allowRoles, validateImage
    validation/         fields, objectId, variant, coercion
  database/
    connection.ts       Mongoose connection
    redis.connection.ts Lazy Redis client with cooldown
    model/              User, Category, Subcategory, Product, Cart, Wishlist,
                        Order, InstallationRequest
  module/
    auth/               Router, service, Zod schema, Passport, OAuth state
    user/               Profile, avatar
    category/           Public listing + admin CRUD
    subcategory/        Public listing + admin CRUD
    product/            Catalog, variants, images, pagination
    cart/               Per-user cart
    wishlist/           Per-user wishlist
    order/              Checkout, statuses, Stripe service and webhook
    installation/       Installation-request workflow
    contact/            Contact email
    security/           Security-log reader
```

Middleware order in `app.controller.ts` is deliberate:

1. Stripe webhook with `express.raw` before the JSON parser.
2. JSON/urlencoded parsing (multipart is passed through to Multer).
3. Static uploads.
4. MongoDB operator-key rejection.
5. Passport initialization.
6. Routes.
7. 404 and centralized error handling.

Controllers own HTTP concerns (status codes, request parsing, upload
middleware); services own business rules and database access. Models contain
schema-level constraints only.

---

## G. Database Models

| Model | Key fields | Relationships | Notes / future work |
| ----- | ---------- | ------------- | ------------------- |
| `User` | name, email (unique), password (`select: false`), role, phone, imageURL, googleId, isActive, isBlocked | Referenced by carts, wishlists, orders, installation requests | `isActive` doubles as "email verified" for password accounts; Google accounts are created active |
| `Category` | en/ar/fr name, imageURL, addedByEmail, isActive | 1-N `Subcategory` (virtual `subcategories`) | Soft delete cascades to subcategories and products |
| `Subcategory` | en/ar/fr name, categoryId, addedByEmail, isActive | N-1 `Category`; 1-N `Product` (virtual `products`) | Toggling `isActive` cascades to products |
| `Product` | multilingual name/description, price, discount, imageURLs, colorImages, variants, subcategoryId, isActive, addedByEmail | N-1 `Subcategory`; referenced by cart, wishlist, and order snapshots | `variants` and image maps are JSON strings; a future migration could normalize them |
| `Cart` | userId, productId, color, size, quantity | N-1 `User`, N-1 `Product` | Unique compound index on user + product + color + size |
| `Wishlist` | userId, productId | N-1 `User`, N-1 `Product` | Unique compound index on user + product |
| `Order` | items snapshot, subtotal, shippingCost, totalAmount, paymentMethod, paymentStatus, paymentProvider, paymentReference, orderStatus, shippingStatus, carrier/tracking, shippingAddress, installationRequested/Id, idempotencyKey | N-1 `User`; 1-1 `InstallationRequest` | Items and address are JSON strings; partial unique index on user + idempotency key |
| `InstallationRequest` | orderId (unique), userId, status, contactName, phone, address, preferredDate, scheduledAt, notes, adminNotes | N-1 `Order`, N-1 `User` | Statuses: PENDING, UNDER_REVIEW, SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED; no technician model |

**Likely future schema changes**

- Normalize `Order.items` and `Product.variants` if reporting or querying by
  individual line/variant becomes necessary.
- Add a technician/assignment model only when the business needs scheduling
  beyond `scheduledAt`.
- Add product reviews/ratings if marketing scope expands.
- Add an index or TTL policy for any future persisted cart/abandoned-checkout
  workflow.

---

## H. API Endpoints

All routes are prefixed with `/v1`. Authentication uses
`Authorization: <role> <access-token>`. `Owner` means the caller must own the
resource or be an admin/super admin, as implemented by the service.

### Health and authentication

| Method | Path | Access | Purpose |
| ------ | ---- | ------ | ------- |
| GET | `/health` | Public | Liveness and configured currency |
| POST | `/auth/signup` | Public (optional super-admin token for staff roles) | Create account; public accounts start inactive |
| POST | `/auth/login` | Public, rate-limited | Email/password login |
| GET | `/auth/verify-email/:token` | Public | Verify email and activate account |
| POST | `/auth/resend-verify-email` | Public, rate-limited | Resend verification email |
| POST | `/auth/forgot-password` | Public, rate-limited | Start reset; `503` without Redis |
| POST | `/auth/reset-password/:token` | Public, rate-limited | Consume single-use reset token |
| POST | `/auth/access-token` | Refresh token | Exchange refresh token for an access token |
| GET | `/auth/google/signup` | Public, Google configured | Start Google signup |
| GET | `/auth/google/signup/callback` | Public, Google configured | Finish Google signup |
| GET | `/auth/google/login` | Public, Google configured | Start Google login |
| GET | `/auth/google/login/callback` | Public, Google configured | Finish Google login and redirect to frontend |

### User

| Method | Path | Access | Purpose |
| ------ | ---- | ------ | ------- |
| GET | `/user/profile` | Authenticated | Read own profile |
| PUT | `/user/profile` | Authenticated | Update name/phone and optional avatar |
| POST | `/user/upload-avatar` | Authenticated | Upload avatar |

### Catalog

| Method | Path | Access | Purpose |
| ------ | ---- | ------ | ------- |
| GET | `/category` | Public | Active categories |
| GET | `/category/:id/subcategories` | Public | Active subcategories of a category |
| POST | `/category/admin` | Admin/SuperAdmin | Create category (JSON or multipart `image`) |
| PUT | `/category/admin/:id` | Admin/SuperAdmin | Update category |
| GET | `/category/admin` | Admin/SuperAdmin | Paginated list including inactive |
| GET | `/category/admin/:id` | Admin/SuperAdmin | Category with subcategories/products |
| DELETE | `/category/admin/:id` | Admin/SuperAdmin | Soft delete and cascade |
| GET | `/subcategory` | Public | Active subcategories |
| GET | `/subcategory/:id` | Public | Active subcategory with products |
| POST | `/subcategory/admin` | Admin/SuperAdmin | Create subcategory |
| PUT | `/subcategory/admin/:id` | Admin/SuperAdmin | Update subcategory |
| GET | `/subcategory/admin` | Admin/SuperAdmin | Paginated list including inactive |
| GET | `/subcategory/admin/:id` | Admin/SuperAdmin | Subcategory with products |
| DELETE | `/subcategory/admin/:id` | Admin/SuperAdmin | Soft delete and cascade |
| GET | `/products` | Public | Active products with filter/sort/pagination |
| GET | `/products/:id` | Public | Active product |
| GET | `/products/category/:categoryId` | Public | Active products in a category |
| GET | `/products/subcategory/:subcategoryId` | Public | Active products in a subcategory |
| POST | `/products/admin` | Admin/SuperAdmin | Create product (multipart `images`) |
| PUT | `/products/admin/:id` | Admin/SuperAdmin | Update product and replace images |
| GET | `/products/admin` | Admin/SuperAdmin | Paginated list including inactive |
| GET | `/products/admin/:id` | Admin/SuperAdmin | Product regardless of state |
| DELETE | `/products/admin/:id` | Admin/SuperAdmin | Soft delete product |

### Cart and wishlist

| Method | Path | Access | Purpose |
| ------ | ---- | ------ | ------- |
| POST | `/cart` | User | Add line or merge an existing variant |
| GET | `/cart` | User | Cart with availability, totals, shipping, currency |
| PUT | `/cart/:productId/:color/:size` | User | Update quantity |
| DELETE | `/cart/:productId/:color/:size` | User | Remove one line |
| DELETE | `/cart` | User | Clear cart |
| POST | `/wishlist/:productId` | User | Add product |
| GET | `/wishlist` | User | List wishlist |
| DELETE | `/wishlist/:productId` | User | Remove product |

### Orders, payments, installation

| Method | Path | Access | Purpose |
| ------ | ---- | ------ | ------- |
| POST | `/order` | Authenticated, rate-limited | Create COD/card order, reserve stock, optionally request installation |
| GET | `/order/mine` | Authenticated | Caller's orders |
| GET | `/order/admin` | Admin/SuperAdmin | Paginated orders |
| GET | `/order/:id` | Owner or admin | Order detail |
| PATCH | `/order/admin/:id` | Admin/SuperAdmin | Update order/payment/shipping status, carrier, tracking |
| POST | `/order/webhook` | Public, Stripe signature | Update payment status only |
| POST | `/installation` | Authenticated | Create a request for the caller's non-cancelled order |
| GET | `/installation/mine` | Authenticated | Caller's requests |
| GET | `/installation/admin` | Admin/SuperAdmin | Paginated requests, optional status filter |
| PATCH | `/installation/admin/:id` | Admin/SuperAdmin | Update status/schedule/admin notes |
| GET | `/installation/:id` | Owner or admin | Request detail |
| POST | `/installation/:id/cancel` | Owner | Cancel before work starts |

### Contact and security

| Method | Path | Access | Purpose |
| ------ | ---- | ------ | ------- |
| POST | `/contact` | Public, rate-limited | Send contact email |
| GET | `/security/logs` | SuperAdmin | Tail and parse `security.log` |

Request/response bodies, query parameters, upload limits, and error cases are
listed in [API_DOCUMENTATION.md](API_DOCUMENTATION.md).

---

## I. Security Review

### I.1 Implemented safeguards

| Issue | Safeguard | Evidence |
| ----- | --------- | -------- |
| Password storage | bcrypt with a clamped cost (8–15, default 10) | Code inspection; signup/login smoke test |
| Password leakage | `select: false`; login explicitly selects the hash; profile excludes it | Code inspection; profile response smoke test |
| Token confusion | `type` claim (`access`, `refresh`, `verify`, `reset`) checked on every verification | Unit tests |
| Forged role tokens | Separate signing secret per role; refresh tokens use a derived secret | Unit tests and code inspection |
| Authorization bypass | `auth` + `allowRoles` on every admin/user route | Route inspection; admin/user smoke test |
| NoSQL operator injection | Recursive rejection of `$` and dotted keys in body/query/params | Code inspection |
| Input validation | Zod on every mutating route; ObjectId and enum rules | Unit tests; smoke test |
| Brute force / abuse | Per-route rate limits on auth, contact, and order endpoints | Repeated signup returned `429` during verification |
| CORS | Explicit allow-list; production denies cross-origin when unset | Code inspection |
| HTTP headers | Helmet and `x-powered-by` disabled | Code inspection |
| OAuth CSRF | Signed, short-lived state token in an HttpOnly cookie | Code inspection |
| Upload safety | Memory storage, size limits, magic-byte validation, generated filenames, no client path use | Code inspection; no Cloudinary runtime test |
| Payment webhook | Raw-body signature verification before JSON parsing | Code inspection; not runtime-tested |
| Order access | Owner check or admin role; installation ownership checks | Code inspection |
| Overselling | Mongo transaction around stock checks/deduction | Runtime COD/card tests |
| Duplicate orders | Optional idempotency key with partial unique index | Runtime repeated-key test |
| Secret handling | `assertEnv()` for signing secrets; optional integrations degrade | Startup inspection; compiled server started |
| Email content | Contact message HTML-escaped before sending | Code inspection |

### I.2 Remaining risks

| Risk | Impact | Suggested direction |
| ---- | ------ | ------------------- |
| Rate limits use an in-memory store | Per-process only; resets on restart; ineffective across replicas | Shared store (Redis) when deploying more than one instance |
| Refresh tokens are stateless | Cannot be revoked; no logout/session list | Refresh-token rotation plus a denylist/session store |
| Stripe session expiry/failure webhook only sets `paymentStatus: failed` | Stock stays reserved and the order remains open until an admin cancels | On expiry, cancel the order and restore stock once, or add a reconciler job |
| Order cancellation stock restore is read-then-write | Two simultaneous cancellations could restore stock twice | Perform the transition with an atomic conditional update and restore only on a successful transition |
| Password reset requires Redis | Reset is unavailable when Redis is down (fails closed with `503`) | Documented; provide Redis in production |
| No automated HTTP/DB integration tests | Regressions in route wiring, transactions, and webhooks rely on manual smoke tests | Add a test database + Supertest suite |
| Google, SMTP, Cloudinary, Stripe are unconfigured locally | Their failure modes and provider callbacks were not exercised | Configure a staging environment and run provider sandbox tests |
| Security log is a local file | Not shared across instances; log retention depends on the host | Ship logs to centralized storage before horizontal scaling |
| `generate_module.py` and Cypress specs are stale | Could mislead contributors | Remove or update when the release process is finalized |
| Order items and variants are JSON strings | Hard to query/report per item; schema drift is invisible to Mongo | Normalize when reporting requirements justify the migration |

No security issue is claimed as fixed unless the fix exists in the code and the
behavior was checked by tests or a runtime request.

---

## J. Environment Variables

`config/.env.example` is the committed source of truth. Required values are
validated at startup; optional integrations fail gracefully or return a clear
`503`.

| Variable | Required | Default / behavior |
| -------- | -------- | ------------------ |
| `NODE_ENV` | No | `development` |
| `PORT` | No | `3007` |
| `BASE_URL` | No | `http://localhost:<PORT>`; used in verification/reset links |
| `FRONTEND_URL` | No | `http://localhost:3000`; OAuth redirect and Stripe return URL |
| `CORS_ORIGINS` | No | Comma-separated allow-list; empty reflects origins in development and denies cross-origin in production |
| `TRUST_PROXY` | No | `false`; set `true`/`1` behind one reverse proxy |
| `JSON_BODY_LIMIT` | No | `5mb` |
| `MONGODB_URI` | Yes in practice | Defaults to `mongodb://localhost:27017/cctv-ecommerce`; replica set required for checkout transactions |
| `REDIS_URL` | No | Enables single-use password-reset tokens |
| `SIGNATURE_ADMIN` | **Yes** | Admin access-token secret |
| `SIGNATURE_USER` | **Yes** | User access-token secret |
| `SIGNATURE_SUPER_ADMIN` | **Yes** | Super-admin access-token secret |
| `VERIFY_SIGNATURE_MY` | **Yes** | Email-verification, password-reset, and OAuth-state secret |
| `ACCESS_TOKEN` | No | `30m` |
| `REFRESH_TOKEN` | No | `30d` |
| `HASH` | No | bcrypt rounds, clamped to 8–15, default `10` |
| `EMAIL`, `PASSWORD` | No | SMTP credentials; contact/reset/verification unavailable without them |
| `EMAIL_FROM_NAME` | No | `CCTV Store` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE` | No | `smtp.gmail.com`, `587`, `false` |
| `CONTACT_RECIPIENT_EMAIL` | No | Falls back to `EMAIL` |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | No | Google routes return `503` when unset |
| `Image_TYPE` | No | `LOCAL` in the template; code default is `CLOUDINARY` |
| `CLOUDINARY_NAME`, `CLOUDINARY_KEY`, `CLOUDINARY_SECRET` | No | Required only when `Image_TYPE=CLOUDINARY` |
| `SERVER` | No | Public base URL for locally stored uploads |
| `CURRENCY` | No | `SAR` |
| `SHIPPING_COST_TYPE` | No | `fixed` (also supports `percentage`) |
| `SHIPPING_COST_VALUE` | No | `0` |
| `PAYMENT_PROVIDER` | No | `stripe` (the only implemented provider) |
| `Secret_key_Stripe` | No | Required for card checkout |
| `STRIPE_WEBHOOK_SECRET` | No | Required to verify webhooks |

Never commit `config/.env`; it is gitignored.

---

## K. Testing Results

Environment: Node `v26.12.1`, npm `11.20.0`, MongoDB `8.2.5` running locally as
replica set `rs0`, server on port `3011`.

### K.1 Static and unit verification

| Command | Actual result |
| ------- | ------------- |
| `npm run typecheck` | Passed (`tsc --noEmit`, no output) |
| `npm test` | **7 suites, 54 tests passed** (Jest + ts-jest, ESM) |
| `npm test -- --runInBand` | **7 suites, 54 tests passed**; exit code `0` |
| `npm run lint` | **0 errors, 21 warnings** (`@typescript-eslint/no-explicit-any` in pre-existing service code) |
| `npm run build` | Passed (`tsc`) |

`npm test` prints Node's `ExperimentalWarning` for VM modules. In parallel mode
Jest occasionally prints "A worker process has failed to exit gracefully"; tests
still pass, and `--runInBand` exits cleanly.

### K.2 Runtime smoke test

The compiled server (`node dist/src/index.js`) was started against the local
replica set and exercised over HTTP. Every assertion below passed:

| Check | Result |
| ----- | ------ |
| `GET /v1/health` | `200 {"status":"ok","currency":"SAR"}` |
| Admin and user signup | `201` each |
| Accounts activated in MongoDB for the test | Succeeded |
| Admin and user login | `200`; admin role returned correctly |
| Category, subcategory, product creation | `201` each |
| Cart add | `201` |
| COD order with installation | `201`; one installation request created |
| Repeated idempotency key | `200`; same order returned; exactly one order stored |
| Card order without Stripe configuration | `502` |
| Stock before/after failed card order | `8 -> 8` (restored) |
| Failed card order state | `paymentStatus=failed`, `orderStatus=cancelled`, `installationRequested=false`, no request id |
| Installation documents for failed card order | `0` |

### K.3 Not executed

| Area | Reason |
| ---- | ------ |
| Cypress E2E | Legacy suite; references older flows and is not part of `npm test` |
| Password reset over HTTP | Redis is not running locally |
| Google OAuth callback | Google credentials are not configured |
| SMTP delivery | SMTP credentials are placeholders |
| Cloudinary uploads | Cloudinary credentials are not configured |
| Stripe checkout and webhook | Stripe keys are not configured; the failure path was tested |
| Cross-user order denial | Not exercised by the smoke script; verified by code inspection only |

No result in this section is inferred or fabricated.

---

## L. Future Development

### Initial release (required before launch)

1. **Saudi payment gateway** — implement Moyasar or Tap behind the existing
   `paymentProvider`/`paymentReference` fields and a verified server-side
   webhook. Keep Stripe only if the business still needs it.
2. **Shipping provider integration** — replace manual carrier/tracking entry
   with an integration when volume justifies it; keep the current manual fields
   as the fallback.
3. **Stripe expiry reconciliation** — decide whether expiry cancels the order
   and restores stock; implement it atomically if so.
4. **Integration tests** — add a test database and HTTP-level tests for auth,
   checkout, stock, installation, and webhook behavior.
5. **Production Redis** — required for password reset; also the natural home
   for shared rate limits and refresh-token revocation.

### Next (after initial release)

6. **Installation scheduling** — technician assignment, availability slots, and
   customer notifications on top of the existing status workflow.
7. **Order reporting** — normalize order line items if finance/analytics needs
   per-product reporting.
8. **Observability** — centralized logs, request IDs, and metrics; the current
   `security.log` is local-only.
9. **Account security** — refresh-token rotation/revocation, session listing,
   and optional MFA.
10. **Catalog growth** — reviews/ratings, recommendations, and richer media
    management if the store needs them.

### Explicitly out of scope for now

- Replacing Express/MongoDB or restructuring the project.
- Building a full technician ERP.
- Adding speculative providers, queues, or caches without a concrete business
  requirement.
