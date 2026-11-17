# CCTV E-Commerce Backend — Day 3 & Day 4 Implementation and Security Report

**Date:** 2026-11-17
**Scope executed:** MVP-09, MVP-10, MVP-11 (Day 3); MVP-12, MVP-14, and the safe
subsets of MVP-13/MVP-15 (Day 4); confirmed Critical/High security fixes plus
safe Medium hardening.
**Branch / HEAD:** `main` at `e26edc8` (unchanged)
**Commits / pushes / resets:** **none**

---

## A. Outcome at a glance

| Ticket | Day | Status | Delivered |
| --- | --- | --- | --- |
| **MVP-09** | 3 | ✅ DONE except bundle inventory | Bundle cart lines, server-side pricing/snapshots, bundle order resolution, option-code validation; product stock reserved in the order transaction. Bundle stock untouched (DEC-01). |
| **MVP-10** | 3 | ✅ DONE | `useCart` / omitted-items checkout from the stored cart, server revalidation and re-pricing, success-only cart clear, idempotent replay without a second clear. |
| **MVP-11** | 3 | ✅ DONE | `orderNumber` (`CCTV-YYMMDD-XXXX`), `statusHistory`, guarded lifecycle transitions, audited manual `paid`, one-time atomic stock release. |
| **MVP-12** | 4 | ⚠️ PARTIAL / BLOCKED | Paymob environment fields, fail-fast config guard, minor-unit money conversion, explicit `503` adapter. Authenticated Paymob HTTP client is **BLOCKED** on confirmed endpoints/credentials. |
| **MVP-13** | 4 | ⛔ BLOCKED | No confirmed Paymob session/intention endpoint, API version, or credentials. No request shape was invented. |
| **MVP-14** | 4 | ⚠️ PARTIAL | `GET /v1/payment/status/:orderNumber` reports stored status with owner/admin access and `404` for non-owners. Authoritative provider inquiry deferred to MVP-18. |
| **MVP-15** | 4 | ⛔ BLOCKED | No Paymob sandbox credentials or confirmed endpoints; recorded **NOT TESTED**, not passed. |

Day 3 behavior is implemented end-to-end at the unit/service level. Day 4 is
complete only where it does not depend on unconfirmed Paymob details.

---

## B. Implementation detail

### B.1 MVP-09 — Bundle cart lines, order resolution, and pricing

- **Cart model** (`src/database/model/cart.model.ts`) now stores a discriminated
  line: either a product line (`productId` + `color` + `size`) or a bundle line
  (`itemType: "bundle"`, `bundleId`, `hddOption`, `installationOption`).
  The old product-only unique index is superseded by a line-oriented index;
  see the operational note in §F.
- **Shared line resolution** (`src/module/cart/cart.lines.ts`) is used by both
  cart and order paths. It:
  - resolves product variants and bundle configuration from the database;
  - validates bundle option codes against the **stored** bundle (unknown codes
    are rejected, not ignored);
  - computes unit price and line total on the server;
  - stores labels/configuration snapshots so later bundle edits do not rewrite
    historical carts or orders;
  - reports product availability from stock; bundle availability is omitted
    until DEC-01 is answered.
- **Cart API**: `POST /v1/cart`, `GET /v1/cart`, `PUT|DELETE /v1/cart/:lineId`
  for any line type, plus the legacy product-only
  `PUT|DELETE /v1/cart/:productId/:color/:size` routes. `GET /v1/cart` returns
  mixed items, subtotal, shipping cost, total, and currency.
- **Order creation** resolves bundle lines server-side, ignores any client
  price/discount/total, snapshots the bundle configuration, and snapshots
  product/bundle details on the order item. Product stock is reserved inside
  the order transaction. **Bundle stock is not read, reserved, or decremented**
  because the inventory model is still an open business decision.
- **Tests:** `cart.validate.test.ts`, `order.validate.test.ts`, and the existing
  bundle pricing/service suites cover line validation, option rejection,
  quantity/stock bounds, and server pricing.

### B.2 MVP-10 — Cart checkout and cart clear semantics

- `POST /v1/orders` accepts:
  - an explicit `items` array (existing contract), or
  - `useCart: true` / an omitted or empty `items` array, which builds the order
    from the caller's stored cart.
- Cart checkout **revalidates and re-prices every line at order time**
  (active product/bundle, variant existence, stock, option codes). A failure
  leaves the cart untouched.
- The cart is cleared **only after a successful order creation**. Validation,
  stock, or transaction failures do not clear it.
- Idempotent replay: the same idempotency key returns the existing order and
  does **not** clear the cart a second time or create a duplicate.
- Explicit items remain supported; the two modes cannot be mixed in one
  request, and client-supplied prices/totals remain ignored.
- **Tests:** `order.validate.test.ts` (mode selection, empty/omitted items) and
  cart validation tests. The full cart→order transaction is verified by code
  review and unit coverage; there is no DB integration harness in this repo.

### B.3 MVP-11 — Order number, history, transitions, stock release

- **`orderNumber`** (`src/module/order/order.number.ts`):
  `CCTV-YYMMDD-XXXX`, generated server-side, backed by a unique partial index.
  Duplicate-key collisions retry with a new suffix. Legacy orders with no
  number keep a deterministic display fallback.
- **`statusHistory`** on the order records
  `{ at, actor, actorId, field, from, to, reason }` for every accepted status
  change.
- **Lifecycle guard** (`src/module/order/order.lifecycle.ts`) is a pure
  transition table:
  - order: `pending → processing|shipped|cancelled`, etc.; `delivered` and
    `cancelled` terminal;
  - payment: `pending → paid|failed`, `failed → paid`; `paid` terminal and
    never downgraded;
  - shipping is independent from payment and fulfilment.
  Illegal transitions throw before any database write.
- **Manual `paid`** requires an explicit reason and is audited with the acting
  admin. Payment/shipping statuses are never inferred from order status.
- **One-time stock release**: `stockReleasedAt` plus an atomic conditional
  update ensures product stock is restored at most once. The first accepted
  transition into `cancelled` releases stock; later cancellation-related events
  cannot release it again. Bundle stock is not touched pending DEC-01.
- **Payment attempts**: order records keep an auditable `paymentAttempts` trail
  so repeated webhook/redirect activity does not silently overwrite history.
- **Routes:** `POST /v1/orders`, `GET /v1/orders/mine`,
  `GET /v1/orders/admin`, `PATCH /v1/orders/admin/:id`,
  `GET /v1/orders/:id` (owner or admin; non-owner receives `404`).
- **Tests:** `order.lifecycle.test.ts`, `order.number.test.ts`,
  `order.validate.test.ts`.

### B.4 MVP-12 — Paymob configuration and minor-unit money

- New environment fields (placeholders only in `.env.example`):
  `PAYMOB_ENV`, `PAYMOB_API_KEY`, `PAYMOB_SECRET_KEY`, `PAYMOB_PUBLIC_KEY`,
  `PAYMOB_HMAC_SECRET`, `PAYMOB_BASE_URL`, `PAYMOB_CHECKOUT_URL`,
  `PAYMOB_INTEGRATION_ID_CARD`, `PAYMOB_INTEGRATION_ID_APPLE_PAY`,
  `PAYMOB_INTEGRATION_ID_TABBY`, `PAYMOB_INTEGRATION_ID_TAMARA`,
  `PAYMENT_ORDER_TTL_MINUTES`.
- `src/module/payment/paymob.config.ts` fails fast when
  `PAYMENT_PROVIDER=paymob`: it lists all missing variables at once, validates
  absolute `http(s)` URLs, and requires at least one positive integration ID.
  Paymob remains optional so cash-on-delivery deployments boot normally.
- `src/module/payment/paymob.provider.ts` performs **no network calls**. Every
  provider operation returns an explicit `503` explaining that endpoints and
  credentials are unconfirmed. No guessed URL, HMAC field order, or payload was
  introduced.
- `src/common/utils/money.ts` converts SAR to integer halalas (minor units) at
  the provider boundary, avoiding decimal/100× amount errors.
- **Tests:** `paymob.config.test.ts`, `payment.registry.test.ts`,
  `money.test.ts`.

### B.5 MVP-14 — Stored payment status endpoint

- `GET /v1/payment/status/:orderNumber` (mounted at `/v1/payment`) returns:
  `orderNumber`, `paymentStatus`, `paymentMethod`, `currency`, `nextAction`.
- Access: the order owner or an admin. A non-owner receives `404` so order
  existence is not disclosed.
- Return-URL/provider query parameters are **ignored**; they can never change a
  payment status. The response contains no provider secrets or raw payloads.
- `nextAction` is derived only from stored state
  (`none`, `complete_payment`, `await_confirmation`, `contact_support`).
- Route is rate-limited (`60` requests / `60` seconds) and validates the order
  number format.
- This is intentionally a **stored-status** endpoint. Authoritative inquiry is a
  separate MVP-18 concern and is **NOT TESTED**.
- **Tests:** `payment.validate.test.ts` (generated and legacy formats accepted;
  malformed or provider-shaped values rejected).

### B.6 MVP-13 / MVP-15 — Blocked, not guessed

- **MVP-13** requires a confirmed Paymob intention/session endpoint, API
  version, integration IDs, and credentials. None were supplied, so no client,
  payload, retry policy, or callback parser was invented.
- **MVP-15** requires sandbox credentials and test procedures. The smoke run is
  recorded as **NOT TESTED** in `EXTERNAL_INTEGRATION_BLOCKERS.md`.
- Selecting `PAYMENT_PROVIDER=paymob` without configuration fails at boot; a
  configured adapter still returns `503` rather than pretending to work.

---

## C. Security review and fixes

Findings below were confirmed by internal code review during this work. They
are not the result of an external penetration test.

| ID | Severity | Confirmed issue | Fix | Regression evidence |
| --- | --- | --- | --- | --- |
| **S-01** | **Critical** | Admin seed script shipped usable default credentials and printed/retained them. | `src/seed-admin.ts` now requires `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` (≥12 chars), never prints the password, and only resets an existing password when `SEED_ADMIN_RESET_PASSWORD=true`. Validation extracted to `src/common/utils/seedCredentials.ts`. | **Automated:** `seedCredentials.test.ts` (6 tests: missing values, invalid email, short password, normalization, reset flag, no password in errors). |
| **S-02** | **High** | Auth middleware trusted JWT claims without re-reading the account, so blocked/deleted/role-changed users kept access until token expiry. | `src/common/middleware/auth.ts` reloads the account on each authenticated request and rejects missing, inactive, blocked, or role-mismatched accounts. Current role is used for authorization. | **Automated:** `auth.test.ts` covers blocked/inactive/missing/role-mismatch tokens. |
| **S-03** | **High** | Stock could be released more than once (e.g. failed payment plus cancellation), double-incrementing inventory. | Added `stockReleasedAt` and an atomic conditional update; only the first accepted cancellation releases stock. Release planning is centralized in `order.lifecycle.ts`. | **Automated:** `order.lifecycle.test.ts` asserts release only on the first `cancelled` transition. |
| **S-04** | **High** | Stripe webhook trusted event type/metadata, so an unpaid or wrong-amount session could mark an order paid. | `src/module/order/stripe.service.ts` requires a stored card order, provider `payment_status=paid`, matching minor-unit amount, and matching currency before setting `paid`. Existing paid state is never downgraded by later failure events. | **Automated:** `stripe.service.test.ts` (unpaid, amount mismatch incl. 100×, missing amount, currency mismatch, non-card). |
| **S-05** | **Medium** | Public product/category/subcategory payloads exposed `addedByEmail` (admin PII). | New recursive `src/common/utils/publicSerializer.ts` strips audit fields (`addedByEmail`, `__v`) from public responses. | **Automated:** `publicSerializer.test.ts` (including nested objects). |
| **S-06** | **Medium** | Order/installation ownership checks returned `403`, confirming that another user's resource exists. | Non-owner access now returns `404` in order and installation reads. Payment status follows the same rule. | **Code review** in service paths; no DB-backed automated test exists in this repo (see §E.3). |
| **S-07** | **Medium** | JWT signing secrets could be short/default/placeholder values and still boot. | `config/env.service.ts` fails fast when any signing secret is missing, shorter than 32 characters, or matches a placeholder pattern. | **Code review**; startup guard is exercised operationally, but has no dedicated automated test (see §E.3). |
| **S-08** | **Medium** | Payment/order creation and status routes had no dedicated throttling. | `rateLimiter` applied to order creation (`60s / 20`) and payment status (`60s / 60`). | **Code review**; middleware is shared and already used by auth routes. No route-level automated test. |

### C.1 Deliberate non-changes

- The legacy Stripe order/payment path is preserved and hardened; it was not
  replaced by the incomplete Paymob adapter.
- `sanitize.ts` still runs after JSON parsing; the Stripe webhook path keeps its
  intentional raw-body bypass so signatures can be verified.
- No card data is stored; no Paymob request shape was guessed; no secrets were
  committed or printed.

---

## D. API, database, and configuration impact

### D.1 API additions (additive)

- Cart line routes: `PUT /v1/cart/:lineId`, `DELETE /v1/cart/:lineId`.
- Order creation accepts `useCart` / omitted `items`.
- Order responses add `orderNumber`, `statusHistory`, `paymentAttempts`, and
  `stockReleasedAt` metadata where applicable.
- Admin status update: `PATCH /v1/orders/admin/:id` with guarded transitions and
  a required reason for manual `paid`.
- `GET /v1/payment/status/:orderNumber`.

All additions are documented in `API_DOCUMENTATION.md`.

### D.2 Database

- Additive fields on orders: `orderNumber`, `statusHistory`, `stockReleasedAt`,
  `paymentAttempts`.
- Additive/changed fields on carts for bundle lines.
- New unique partial index for `orderNumber`; collision retry is handled in
  code.
- **Required deployment step:** existing databases must drop the obsolete
  product-only cart index `userId_1_productId_1_color_1_size_1`. Leaving it in
  place can reject bundle cart lines whose product fields are empty.

### D.3 Configuration

- Seed script: `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` are required;
  `SEED_ADMIN_RESET_PASSWORD=true` is explicit opt-in.
- JWT/signing secrets: minimum 32 characters, placeholder values rejected.
- Paymob: all `PAYMOB_*` values are needed only when
  `PAYMENT_PROVIDER=paymob`; `PAYMENT_ORDER_TTL_MINUTES` defaults to 30.
- `.env.example` contains names/placeholders only; real values stay untracked.

---

## E. Verification evidence

Verification was re-run on the final working tree after the last code change.

| Check | Command | Result |
| --- | --- | --- |
| TypeScript | `npm run typecheck` | **PASS** (`tsc --noEmit`, no output) |
| Lint | `npm run lint` | **PASS**: 0 errors, 26 warnings (all `@typescript-eslint/no-explicit-any`, no error gate) |
| Tests | `npm test` | **PASS**: 23 suites / 158 tests |
| Formatting (changed TypeScript) | `npx prettier --check --end-of-line auto <changed/new .ts>` | **PASS** |

### E.1 Test growth

- Session baseline: 14 suites / 98 tests.
- Final: **23 suites / 158 tests**.
- New suites: `money`, `publicSerializer`, `order.lifecycle`, `order.number`,
  `order.validate`, `stripe.service`, `payment.validate`, `paymob.config`,
  `seedCredentials`.

### E.2 Formatting note

The repository has pre-existing CRLF/Prettier drift in untouched files, so a
global `npx prettier --check .` still reports baseline noise. Every changed or
new TypeScript file passes with `--end-of-line auto`. No formatting-only rewrite
of unrelated files was performed.

### E.3 What was **not** executed (honest limitations)

| Item | Why | Status |
| --- | --- | --- |
| Cypress API suite | It mutates data on the shared Atlas host configured in `config/.env`. | **NOT RUN** |
| DB-backed cart→order integration | No isolated database/test harness is configured in this repo. | **NOT RUN**; unit tests plus code review only |
| Paymob sandbox smoke (MVP-15) | No sandbox credentials/integration IDs/confirmed endpoints. | **NOT TESTED** |
| External penetration test | Out of scope for this task. | **NOT PERFORMED** |
| Automated tests for S-06/S-07/S-08 | Ownership `404` and startup/route guards need a DB/app harness; they were verified by code review. | **GAP** — see §H |

No unexecuted check is reported as passing.

---

## F. Blockers and deferred scope

| Item | Blocker | Safe state delivered |
| --- | --- | --- |
| **DEC-01** — bundle inventory | Business decision not made: reserve at order, deduct at payment, or aggregate availability. | Bundle cart/order lines work without stock; availability omitted; no bundle decrement or restore. |
| **MVP-12 authenticated client** | Confirmed Paymob API base/version, credentials, and HMAC rules are missing. | Config guard + minor-unit money + honest `503` adapter. |
| **MVP-13 session/intention** | No confirmed endpoint/version, credentials, or integration IDs. | No guessed client or payload. |
| **MVP-15 sandbox smoke** | No sandbox credentials or test procedure. | Recorded **NOT TESTED** in the blockers log. |
| **MVP-14 authoritative inquiry** | Depends on Paymob status API and MVP-18 reconciliation. | Stored-status endpoint only. |
| **Shipping provider / VAT / ZATCA** | No provider contract or tax decision supplied. | Out of scope; not implemented or claimed. |

Full details remain in `docs/implementation/EXTERNAL_INTEGRATION_BLOCKERS.md`.

---

## G. Git safety

- **Branch:** `main`; **HEAD:** `e26edc8` (“Fix Nextjs Problem with --webpack”).
- **No commits, pushes, resets, stashes, clean, checkout, or history changes.**
- **Initial working tree:** only the two pre-existing user changes under
  `e-commerce-Dash/` (`package-lock.json`, `public/mockServiceWorker.js`).
- **Final working tree:** the same two pre-existing frontend changes, plus:
  - 26 modified tracked backend files (including documentation);
  - 21 new backend files (including this report).
- `config/.env` was not read for secret values, modified, or committed.

Final status summary:

```
modified tracked: 28  (2 pre-existing frontend + 26 backend)
new untracked:    21  (all backend, including this report)
HEAD:             e26edc8  (unchanged)
```

Backend changes are uncommitted and ready for review. The two frontend files
were not touched by this work.

---

## H. Remaining work and next actions

1. **Obtain written Paymob answers** (B-01–B-12): KSA hosts, API version,
   credentials, integration IDs, HMAC field order, sandbox procedure. Then
   implement MVP-13 and run MVP-15.
2. **Resolve DEC-01** and only then add bundle stock/availability, deduction,
   and restore logic.
3. **Implement MVP-18 authoritative payment inquiry/reconciliation** and replace
   the stored-status limitation for card payments.
4. **Add a DB-backed test harness** for ownership `404`s, stock release, cart
   clear, and webhook transitions; close the S-06/S-07/S-08 automated-test gaps.
5. **Run Cypress** against an isolated database, not the shared Atlas host.
6. **Drop the obsolete cart index** on existing deployments:
   `userId_1_productId_1_color_1_size_1`.
7. Treat repo-wide Prettier/CRLF normalization as a separate formatting-only
   change if desired.

**Bottom line:** Day 3 is implemented; Day 4 is implemented only where it does
not depend on unconfirmed Paymob details. All executable checks on the final
tree pass, blocked subsets are explicitly labelled, and no Git history was
changed.
