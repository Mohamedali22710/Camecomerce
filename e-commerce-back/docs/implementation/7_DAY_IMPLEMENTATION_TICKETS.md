# 7-Day Implementation Tickets — CCTV E-Commerce Backend

Companion to `7_DAY_MVP_PLAN.md`.

**Execution status (2026-11-16):** Day 1 tickets MVP-01, MVP-02, and MVP-04 are
complete. MVP-03 is **BLOCKED** (no Paymob KSA account-manager contact or
merchant credentials were supplied). Day 2 tickets MVP-05, MVP-06, MVP-07, and
MVP-08 are implemented except the bundle inventory/availability subset, which is
**BLOCKED** on business decision DEC-01. No Day 3+ ticket has been executed.

| Ticket | Day | Status | Notes |
| --- | --- | --- | --- |
| MVP-01 | 1 | DONE | Contract frozen; baseline recorded |
| MVP-02 | 1 | DONE | Mock adapter + registry; mock refused in production |
| MVP-03 | 1 | BLOCKED | Request pack prepared; no recipient/credentials |
| MVP-04 | 1 | DONE | `brand` + bounded `specifications` |
| MVP-05 | 2 | DONE except inventory | Model has no `stock`; DEC-01 open |
| MVP-06 | 2 | DONE except stock admin | CRUD; stock input rejected |
| MVP-07 | 2 | DONE except availability | Public reads omit availability |
| MVP-08 | 2 | DONE | Pure server-side pricing + tests |

## How to read a ticket

| Field | Meaning |
| --- | --- |
| Priority | `P0` launch blocker, `P1` launch-adjacent, `P2` post-launch |
| Estimate | Net engineering hours from the 47h capacity |
| Dependencies | Tickets that must be merged first |
| Delivery day | Day 1–7 of the 7-day window |
| Tests | What must exist and be run before the ticket is done |

Global definition of done applies to every ticket (§9 of the plan):
`typecheck` green, no new lint errors, `npm test` green, acceptance demonstrated
by a command or HTTP request, docs updated in the same change set, no secrets in
code or logs.

**Numbering note:** MVP-01…MVP-26 are the approved 47-hour set. PL-xx tickets are
post-launch and are **not** part of the 7-day commitment.

---

## Phase 1 — Foundation (Day 1)

### MVP-01 — Freeze order, payment, and envelope contracts; verify baseline

| Field | Value |
| --- | --- |
| Priority | P0 |
| Estimate | 2.0h |
| Dependencies | None |
| Delivery day | Day 1 |
| Module | `order`, `payment`, `config` |

**Problem.** Order creation, payment session creation, and webhook handling are
currently coupled to Stripe inside `src/module/order/stripe.service.ts`. Building
Paymob directly into that file would make both providers fragile and would hide
the contract that the frontend depends on.

**Scope / expected files.**
- `src/module/payment/payment.types.ts` (new) — `PaymentProvider` interface,
  `CreateSessionInput`, `CreateSessionResult`, `VerifiedEvent`, `PaymentStatus`.
- `docs/implementation/7_DAY_MVP_PLAN.md` — record the frozen contract under §11
  if it changes.
- Read-only baseline: `package.json`, `config/env.service.ts`,
  `src/module/order/order.service.ts`, `src/database/model/order.model.ts`.

**Steps.**
1. Run `npm run typecheck`, `npm run lint`, `npm test`; record actual results.
2. Define the provider interface: `createSession(input)`, `verifyAndParse(rawBody,
   headers)`, `fetchStatus(providerRef)`, `refund?(...)`.
3. Freeze the response envelope for checkout: `{ message, data: { orderId,
   orderNumber, paymentStatus, redirectUrl | null, provider } }`.
4. Record the env contract: `PAYMENT_PROVIDER`, `PAYMOB_*`, `PAYMENT_ORDER_TTL_MINUTES`.
5. Do not modify business logic in this ticket.

**Acceptance criteria.**
- Baseline results recorded in the ticket PR description (pass/fail, counts).
- `payment.types.ts` compiles and is imported by nothing yet.
- The field contract is written down and matches the plan.

**Tests.** None added; baseline suite must run unchanged.

**Docs.** Contract note in the plan and `API_DOCUMENTATION.md` skeleton section.

**Guards.** Clean Code, Docs.

---

### MVP-02 — Payment module skeleton + mock adapter

| Field | Value |
| --- | --- |
| Priority | P0 |
| Estimate | 2.0h |
| Dependencies | MVP-01 |
| Delivery day | Day 1 |
| Module | `payment` |

**Problem.** Paymob credentials may not arrive by Day 4. Without a mock provider
that implements the same contract, the checkout flow cannot be built or tested,
and payment logic would rot behind a credential blocker.

**Scope / expected files.**
- `src/module/payment/mock.provider.ts` (new)
- `src/module/payment/payment.registry.ts` (new) — selects provider from
  `PAYMENT_PROVIDER` (`paymob` | `mock` | `stripe` legacy).
- `config/env.service.ts`, `config/.env.example` — `PAYMENT_PROVIDER`,
  `PAYMENT_MOCK=true` documentation only.

**Steps.**
1. Implement mock `createSession` returning a deterministic local redirect URL
   and a fake `providerReference`.
2. Implement mock `verifyAndParse` that accepts only a signed test payload.
3. Implement `fetchStatus` returning the stored mock state.
4. Registry throws a clear configuration error when an unknown provider is set.
5. Never enable mock in production: refuse to boot if `NODE_ENV=production` and
   `PAYMENT_PROVIDER=mock`.

**Acceptance criteria.**
- Unit call returns a session with the exact same shape as the planned Paymob
  result.
- Production + mock combination fails fast with an explicit message.
- No existing route behaviour changes.

**Tests.** One Jest test for registry selection and the production guard.

**Docs.** `.env.example` provider section; runbook note that mock is dev-only.

**Guards.** Clean Code, Test.

---

### MVP-03 — Paymob KSA credential and capability request (non-code)

| Field | Value |
| --- | --- |
| Priority | P0 |
| Estimate | 1.0h |
| Dependencies | None |
| Delivery day | Day 1 |
| Module | external |

**Problem.** Nothing can be verified without knowing which Paymob KSA
environment, endpoints, and payment methods are actually enabled for this
merchant. Guessing produces an integration that compiles and fails in production.

**Scope.** Update `EXTERNAL_INTEGRATION_BLOCKERS.md` with answers received. No
source code.

**Steps.**
1. Send the credential checklist (B-01…B-12 in the blockers document) to the
   Paymob KSA account manager.
2. Ask explicitly for: base URLs per service, API version, integration IDs per
   method, HMAC secret, sandbox credentials, and the exact HMAC field list.
3. Record the answers, the date, and who answered.
4. If there is no answer by Day 4, mark the gate as failed and continue with mock.

**Acceptance criteria.**
- Checklist sent and logged with a timestamp.
- Every answer is recorded verbatim or marked "no answer".
- No endpoint is treated as confirmed without a written source.

**Tests.** Not applicable.

**Docs.** `EXTERNAL_INTEGRATION_BLOCKERS.md`.

**Guards.** Docs.

---

### MVP-04 — Product technical specifications + brand

| Field | Value |
| --- | --- |
| Priority | P0 |
| Estimate | 1.5h |
| Dependencies | MVP-01 (baseline) |
| Delivery day | Day 1 |
| Module | `product` |

**Problem.** CCTV buyers choose on resolution, lens, night vision, IP rating,
channels, and storage. The product model only has free-text descriptions, so the
storefront cannot show a comparison table.

**Scope / expected files.**
- `src/database/model/product.model.ts` — add `brand` (string) and
  `specifications` (JSON string, same convention as `variants`).
- `src/module/product/product.validate.ts` — Zod schema for a bounded array.
- `src/module/product/product.service.ts` — serialize and persist.
- `API_DOCUMENTATION.md`.

**Steps.**
1. Define `specifications` as `[{ keyEn, keyAr?, valueEn, valueAr?, unit? }]`
   with max 40 entries, key ≤ 60 chars, value ≤ 200 chars.
2. Add `brand` (≤ 80 chars).
3. Parse on read with a safe fallback to `[]`; never throw on legacy rows.
4. Accept the field in create and update; ignore unknown keys as today.
5. Keep `variants`, pricing, and images untouched.

**Acceptance criteria.**
- `POST /v1/products/admin` accepts specifications and returns them normalized.
- A product with no specifications returns `[]`, not `null` or an error.
- Legacy documents still load and serialize.
- Invalid payloads return `400` with a field path.

**Tests.** One Zod unit test: valid, too many entries, oversized value, legacy
null.

**Docs.** Product request/response examples updated.

**Guards.** Clean Code, Test, Docs.

---

## Phase 2 — Bundles (Day 2)

### MVP-05 — Bundle model

| Field | Value |
| --- | --- |
| Priority | P0 |
| Estimate | 1.5h |
| Dependencies | MVP-04 |
| Delivery day | Day 2 |
| Module | `bundle` |

**Problem.** There is no bundle concept. The client sells 4-camera and 8-camera
kits with HDD and installation choices, and those must be first-class sellable
items with server-owned prices.

**Scope / expected files.**
- `src/database/model/bundle.model.ts` (new)
- `src/common/validation/bundle.ts` (new, if shared labels are needed)

**Steps.**
1. Model: `code` (unique), `en_name`, `ar_name`, `description`, `imageURLs`,
   `basePrice` (SAR, > 0), `discount` (0–100), `cameras` (array of
   `{ productId, color, size, quantity }`), `hddOptions` (array of
   `{ code, labelEn, labelAr, priceDelta }`), `installationOptions` (array of
   `{ code, labelEn, labelAr, priceDelta, city? }`), `stock` (int ≥ 0),
   `isActive`.
2. Unique index on `code`; index on `{ isActive, createdAt }`.
3. Use native arrays/objects for this new collection. Do **not** replicate the
   JSON-string pattern; no migration is involved because the collection is new.
4. Enforce: at least one camera component, at least one HDD option, at least one
   installation option, unique option codes, non-negative deltas.

**Acceptance criteria.**
- A 4-camera bundle and an 8-camera bundle can be persisted with both HDD and
  both installation options.
- Duplicate `code` fails with `409` through the existing error handler.
- Invalid structure is rejected before persistence.

**Tests.** Jest unit test for the schema validation rules.

**Docs.** Data model section in `API_DOCUMENTATION.md`.

**Guards.** Clean Code, Test.

**Inventory assumption (DEC-01).** `stock` is the bundle's own counter. Component
products are descriptive and are **not** deducted in the MVP.

---

### MVP-06 — Bundle admin CRUD

| Field | Value |
| --- | --- |
| Priority | P0 |
| Estimate | 3.0h |
| Dependencies | MVP-05 |
| Delivery day | Day 2 |
| Module | `bundle` |

**Problem.** Staff must be able to create and price kits without a deploy.

**Scope / expected files.**
- `src/module/bundle/bundle.controller.ts` (new)
- `src/module/bundle/bundle.service.ts` (new)
- `src/module/bundle/bundle.validate.ts` (new)
- `src/app.controller.ts` — mount `/v1/bundles` after the JSON parser.

**Steps.**
1. `POST /v1/bundles/admin` — create (admin, superAdmin).
2. `PUT /v1/bundles/admin/:id` — update, including options and stock.
3. `GET /v1/bundles/admin` — list all, including inactive, paginated
   (`buildQuery`).
4. `GET /v1/bundles/admin/:id` — detail.
5. `DELETE /v1/bundles/admin/:id` — soft delete (`isActive=false`).
6. Validate every `productId` exists; do not require them to be active at bundle
   creation time, but warn in the response if one is inactive.
7. Reject a bundle whose option codes duplicate.

**Acceptance criteria.**
- Admin can create, edit, and deactivate a bundle.
- Non-admin receives `403`; anonymous receives `401`.
- Unknown product component returns `404` with the component index.
- Soft-deleted bundles disappear from public reads but remain readable by admin.
- Existing product/category routes are unaffected.

**Tests.** One controller-level test for role guard + one service test for
component validation.

**Docs.** Admin endpoint table.

**Guards.** Clean Code, Test, Docs.

---

### MVP-07 — Public bundle listing and detail

| Field | Value |
| --- | --- |
| Priority | P0 |
| Estimate | 1.0h |
| Dependencies | MVP-06 |
| Delivery day | Day 2 |
| Module | `bundle` |

**Problem.** The storefront needs to list and open bundles with SAR totals.

**Scope / expected files.**
- `src/module/bundle/bundle.service.ts`
- `src/module/bundle/bundle.controller.ts`
- `src/module/bundle/bundle.serialize.ts` (new, or inside service)

**Steps.**
1. `GET /v1/bundles` — active only, paginated, default sort newest.
2. `GET /v1/bundles/:id` — active only, `404` otherwise.
3. Serialize: computed `basePrice`, `finalPrice`, option deltas, availability
   (`stock > 0`), `currency: env.CURRENCY`, component summaries with names.
4. Never expose `addedByEmail` or internal metadata.

**Acceptance criteria.**
- Active bundles list with correct currency and pagination metadata.
- Inactive bundle returns `404` publicly.
- Response contains no admin-only fields.

**Tests.** One service test for the active-only filter.

**Docs.** Public endpoint examples.

**Guards.** Clean Code, Test, Docs.

---

### MVP-08 — Bundle option validation and server-side total

| Field | Value |
| --- | --- |
| Priority | P0 |
| Estimate | 1.0h |
| Dependencies | MVP-05 |
| Delivery day | Day 2 |
| Module | `bundle`, `common/utils` |

**Problem.** Prices and option selections must never be trusted from the client.
A single shared function is required so cart, order, and payment all agree.

**Scope / expected files.**
- `src/module/bundle/bundle.pricing.ts` (new)
- `src/common/utils/pricing.ts` — reuse `roundMoney`, do not duplicate it.

**Steps.**
1. `resolveBundleSelection(bundle, { hddCode, installationCode, quantity })`.
2. Validate codes against the bundle's own option lists; unknown code → `400`
   naming the option.
3. Compute `unitTotal = basePrice - discount + hddDelta + installationDelta`,
   then `lineTotal = roundMoney(unitTotal * quantity)`.
4. Return the resolved labels and deltas so the caller can snapshot them.
5. Pure function, no database access.

**Acceptance criteria.**
- 4-cam 1TB without installation, 4-cam 2TB with Riyadh installation, and the
  8-cam equivalents all produce hand-checked totals.
- Unknown HDD or installation code is rejected.
- Negative or missing price delta is treated as `0` and never reduces below base.
- Discount capped at 100.

**Tests.** Jest table-driven test with at least 6 cases including invalid codes
and rounding.

**Docs.** Pricing rule stated in `API_DOCUMENTATION.md`.

**Guards.** Clean Code, Test.

---

## Phase 3 — Checkout and order integrity (Day 3)

### MVP-09 — Bundle cart lines, order resolution, and availability

| Field | Value |
| --- | --- |
| Priority | P0 |
| Estimate | 3.5h |
| Dependencies | MVP-08, MVP-06 |
| Delivery day | Day 3 |
| Module | `cart`, `order`, `bundle` |

**Problem.** A bundle must be addable to the cart, priced server-side, and
converted into an order line that snapshots what the customer bought. Today the
cart only supports `productId/color/size` and the order only prices products.

**Scope / expected files.**
- `src/database/model/cart.model.ts` — additive `itemType` (`product` | `bundle`),
  `bundleId`, `hddOption`, `installationOption`.
- `src/module/cart/cart.validate.ts`, `cart.service.ts`, `cart.controller.ts`.
- `src/module/order/order.validate.ts`, `order.service.ts`.
- `src/module/bundle/bundle.pricing.ts` — consumed by both.

**Steps.**
1. Cart: accept `{ itemType: "bundle", bundleId, hddOption, installationOption,
   quantity }`; keep the product path unchanged.
2. Validate bundle active, options valid, `bundle.stock >= requested`.
3. `GET /v1/cart` returns bundle lines with computed price, resolved labels, and
   availability.
4. Order creation: for a bundle line, re-resolve price from the database (never
   from the request), snapshot bundle name, options, component list, and price.
5. Decrement `bundle.stock` inside the existing transaction, guarded with
   `stock >= quantity`; on failure abort the whole order.
6. Cancel/expiry restores `bundle.stock` once, using the same idempotency marker
   introduced in MVP-19.
7. Do **not** touch component product stock (DEC-01).

**Acceptance criteria.**
- Bundle in cart shows the same total as the order and as the payment amount.
- Client-supplied `price` is ignored; changing it changes nothing.
- Ordering 2 when stock is 1 returns `400` and reserves nothing.
- Order snapshot survives later bundle edits (price/name/options frozen).
- Mixed cart (product + bundle) totals correctly.
- Bundle counter decrements once per order, not per component.

**Tests.** Unit: selection + snapshot. Integration: mixed cart → order totals and
stock decrement.

**Docs.** Cart and order payload examples with bundle lines.

**Guards.** Clean Code, Test, Docs.

---

### MVP-10 — Cart-to-order checkout and cart clear

| Field | Value |
| --- | --- |
| Priority | P0 |
| Estimate | 1.5h |
| Dependencies | MVP-09 |
| Delivery day | Day 3 |
| Module | `order`, `cart` |

**Problem.** The frontend must resend every line when ordering, and the cart is
never cleared, so customers can double-order and abandoned rows accumulate.

**Scope / expected files.**
- `src/module/order/order.service.ts`
- `src/module/order/order.validate.ts`
- `src/module/cart/cart.service.ts` (a `clearCartForUser` helper if needed)

**Steps.**
1. Accept `useCart: true` (or an absent `items` array) and build order lines from
   the user's cart server-side.
2. Re-validate every cart line at order time (price, availability, options).
3. Keep explicit `items[]` working for clients that do not use the cart.
4. After the order transaction commits successfully, clear that user's cart.
5. On any failure, leave the cart untouched.
6. Idempotency: an existing `idempotencyKey` returns the stored order and does not
   clear the cart twice.

**Acceptance criteria.**
- Checkout from cart creates the order and empties the cart.
- A failed checkout leaves the cart intact.
- Replayed idempotency key returns `200` with the same order and no second clear.
- Explicit items still work and still do not depend on cart contents.

**Tests.** Integration: successful clear, failed order keeps cart, replay no-op.

**Docs.** Checkout request modes documented.

**Guards.** Clean Code, Test, Docs.

---

### MVP-11 — Order number, status history, guarded transitions

| Field | Value |
| --- | --- |
| Priority | P0 |
| Estimate | 2.0h |
| Dependencies | MVP-10 |
| Delivery day | Day 3 |
| Module | `order` |

**Problem.** Orders are identified only by ObjectId, have no timeline, and an
admin can set `paymentStatus: "paid"` by hand with no record of who did it or why.
That is both a support problem and a fraud-audit problem.

**Scope / expected files.**
- `src/database/model/order.model.ts` — additive `orderNumber` (unique),
  `statusHistory` (array), `stockReleasedAt`, `paymentAttempts` reference.
- `src/module/order/order.service.ts`
- `src/module/order/order.validate.ts`

**Steps.**
1. Generate `CCTV-YYMMDD-XXXX` (random, retry on collision) at creation; unique
   index; backfill on read for legacy rows if any exist in dev only.
2. Append `{ at, actor, field, from, to, reason? }` on every status change.
3. Enforce transitions: `cancelled` is terminal; `paid` is never downgraded;
   `delivered` cannot return to `pending`; shipping/order/payment remain
   independent.
4. Admin manual `paid` requires `reason` and writes an audit entry.
5. Expose `orderNumber` in every order response.

**Acceptance criteria.**
- New orders have a unique human-readable number.
- Every transition is visible in `statusHistory` with actor and timestamp.
- Illegal transitions return `400` and change nothing.
- Manual `paid` without `reason` returns `400`.
- Legacy orders still serialize.

**Tests.** Unit: transition table. Integration: admin update writes history.

**Docs.** Order lifecycle table and admin update contract.

**Guards.** Clean Code, Test, Docs.

---

## Phase 4 — Paymob integration (Day 4)

### MVP-12 — Paymob configuration, auth client, minor-unit money

| Field | Value |
| --- | --- |
| Priority | P0 |
| Estimate | 2.0h |
| Dependencies | MVP-02, MVP-03 |
| Delivery day | Day 4 |
| Module | `payment`, `config` |

**Problem.** Paymob needs server-side authentication and integer minor units.
Sending `SAR` decimals is a classic source of 100× errors.

**Scope / expected files.**
- `config/env.service.ts`, `config/.env.example`
- `src/module/payment/paymob.provider.ts` (new)
- `src/common/utils/money.ts` (new) — `toMinorUnits`, `fromMinorUnits`

**Steps.**
1. Env: `PAYMOB_API_KEY`, `PAYMOB_SECRET_KEY`, `PAYMOB_PUBLIC_KEY`,
   `PAYMOB_HMAC_SECRET`, `PAYMOB_BASE_URL`, `PAYMOB_CHECKOUT_URL`,
   `PAYMOB_INTEGRATION_ID_CARD`, `PAYMOB_INTEGRATION_ID_APPLE_PAY`,
   `PAYMOB_INTEGRATION_ID_TABBY`, `PAYMOB_INTEGRATION_ID_TAMARA`,
   `PAYMOB_ENV` (`sandbox` | `live`), `PAYMENT_ORDER_TTL_MINUTES`.
2. Auth client: obtain and cache the provider token with expiry; refresh before
   use; never log it.
3. Money: `toMinorUnits(12.34) === 1234`, `fromMinorUnits(1234) === 12.34`,
   reject negative and non-finite values.
4. Fail fast with a clear message when a required Paymob variable is missing and
   the provider is `paymob`.
5. Keep secrets out of `assertEnv()` optional list — Paymob is optional so COD
   still boots, but `PAYMENT_PROVIDER=paymob` without keys must error.

**Acceptance criteria.**
- Amount conversion covered by tests including `0.1 + 0.2` style rounding.
- Missing config produces one explicit startup or request error, not `undefined`
  in a URL.
- Token is never present in a response or log line.

**Tests.** Jest: money conversion table, config guard.

**Docs.** `.env.example` with placeholders only; secret handling note.

**Guards.** Clean Code, Test, Docs.

---

### MVP-13 — Paymob session/intention creation

| Field | Value |
| --- | --- |
| Priority | P0 |
| Estimate | 3.0h |
| Dependencies | MVP-12 |
| Delivery day | Day 4 |
| Module | `payment`, `order` |

**Problem.** There is no Paymob session. Card/mada/Apple Pay checkout cannot
start.

**Scope / expected files.**
- `src/module/payment/paymob.provider.ts`
- `src/module/payment/payment.service.ts` (new)
- `src/module/order/order.service.ts`
- `src/module/payment/payment.validate.ts` (new)

**Steps.**
1. `createSession` sends: amount in halalas, currency `SAR`, order
   `special_reference = orderNumber`, item lines, customer/billing data derived
   from the shipping address, `notification_url` (webhook), `redirection_url`
   (frontend result page), and the activated payment-method integration IDs.
2. Use the endpoint/version confirmed in MVP-03. If unconfirmed, implement behind
   a single constant and mark it `UNCONFIRMED` in the code comment and blockers
   file.
3. Persist the provider reference and intention id on the order; do not store the
   raw secret or client secret in logs.
4. On provider error: cancel the order, release stock through the MVP-19 path,
   return a safe `502` — never leave a payable orphan.
5. Response: `{ orderId, orderNumber, redirectUrl | clientSecret, provider }`.
6. Stripe path stays behind `PAYMENT_PROVIDER=stripe` for rollback only.

**Acceptance criteria.**
- A session is created with an amount that exactly matches the stored order total
  in halalas.
- `special_reference` equals the order number.
- Provider failure cancels the order and releases stock once.
- No secret appears in the response body.
- With mock credentials, the same code path succeeds.

**Tests.** Unit with a stubbed HTTP client: payload shape, amount, failure path,
no-secret assertion.

**Docs.** Checkout sequence diagram in text; request/response contract.

**Guards.** Clean Code, Test, Docs.

---

### MVP-14 — Redirect/return contract and payment-status endpoint

| Field | Value |
| --- | --- |
| Priority | P0 |
| Estimate | 1.5h |
| Dependencies | MVP-13 |
| Delivery day | Day 4 |
| Module | `payment`, `order` |

**Problem.** A return URL is the most common place to accidentally mark an order
paid. The frontend needs a safe endpoint that reports truth without trusting the
browser.

**Scope / expected files.**
- `src/module/payment/payment.controller.ts` (new)
- `src/module/order/order.controller.ts`
- `src/app.controller.ts` — mount `/v1/payment`.

**Steps.**
1. `GET /v1/payment/status/:orderNumber` (owner or admin) returns stored
   `paymentStatus`, method, and a safe `nextAction` hint.
2. If status is `pending` and a provider reference exists, trigger the
   authoritative inquiry (MVP-18) before responding — never mark paid from the
   query string.
3. Ignore all return-URL parameters except `orderNumber`; reject unknown
   provider-supplied fields.
4. Return `404` for someone else's order, not `403` with existence leakage.
5. Do not expose `paymentReference` or provider payloads to customers.

**Acceptance criteria.**
- Calling the endpoint with `?success=true` does not change status.
- Pending + provider reference performs an inquiry and reflects the real result.
- Another user's order returns `404`.
- Response never includes a provider secret or raw payload.

**Tests.** Integration: forged success param, ownership check, inquiry path with
stubbed provider.

**Docs.** Frontend return-flow contract.

**Guards.** Clean Code, Test, Docs.

---

### MVP-15 — Sandbox smoke run

| Field | Value |
| --- | --- |
| Priority | P0 |
| Estimate | 0.5h |
| Dependencies | MVP-13, MVP-03 |
| Delivery day | Day 4 |
| Module | external |

**Problem.** Code that compiles is not an integration. A session must actually be
created, or the missing input must be proven.

**Steps.**
1. If test credentials exist: create one session for a real order and record the
   provider reference (not the secret).
2. If not: run the mock provider and record the exact missing variable or
   activation.
3. Update the blockers document with the outcome and timestamp.

**Acceptance criteria.**
- A session reference exists, or the blocker is written with the specific missing
  item and who owns it.
- Result is recorded as VERIFIED or NOT TESTED, never "should work".

**Tests.** Manual, recorded in the blockers verification log.

**Docs.** `EXTERNAL_INTEGRATION_BLOCKERS.md` verification log.

**Guards.** Docs.

---

## Phase 5 — Paymob verification (Day 5)

### MVP-16 — Webhook raw route and HMAC verification

| Field | Value |
| --- | --- |
| Priority | P0 |
| Estimate | 2.5h |
| Dependencies | MVP-13 |
| Delivery day | Day 5 |
| Module | `payment`, `app` |

**Problem.** The current Stripe webhook is Stripe-specific and there is no Paymob
verification. Without HMAC validation, anyone can mark an order paid.

**Scope / expected files.**
- `src/module/payment/paymob.webhook.ts` (new)
- `src/module/payment/payment.controller.ts`
- `src/app.controller.ts` — mount the raw route **before** `express.json`.
- `src/module/payment/paymob.hmac.test.ts` (new)

**Steps.**
1. `POST /v1/payment/paymob/webhook` with `express.raw({ type: "application/json" })`.
2. Read the `hmac` query parameter; compute HMAC-SHA512 over the confirmed field
   list in the confirmed order; compare with `crypto.timingSafeEqual`.
3. Reject missing/invalid signature with `401`; log only a hash prefix.
4. Parse only after verification.
5. Handle both transaction and order callback shapes defensively; unknown fields
   are ignored, not trusted.
6. Never write the raw payload with sensitive fields to logs.

**Acceptance criteria.**
- Correct signature + valid payload is accepted.
- Tampered body or signature returns `401` and changes no order.
- Missing `hmac` returns `401`.
- Route receives the raw buffer, not a parsed object (assert `Buffer.isBuffer`).
- Stripe webhook route still works unchanged.

**Tests.** Jest with a fixed secret and known vector; tamper case; Buffer
assertion.

**Docs.** Webhook URL, signature algorithm, and retry expectation.

**Guards.** Clean Code, Test, Docs.

---

### MVP-17 — Payment ledger and replay dedupe

| Field | Value |
| --- | --- |
| Priority | P0 |
| Estimate | 2.0h |
| Dependencies | MVP-16 |
| Delivery day | Day 5 |
| Module | `payment` |

**Problem.** Providers retry callbacks. Applying the same event twice can
double-transition, double-release stock, or corrupt reporting. There is also no
payment history to reconcile against.

**Scope / expected files.**
- `src/database/model/payment.model.ts` (new)
- `src/module/payment/payment.service.ts`
- `src/module/order/order.service.ts`

**Steps.**
1. `PaymentTransaction`: `orderId`, `provider`, `providerTransactionId` (unique
   with provider), `intentionId`, `amountMinor`, `currency`, `status`, `success`,
   `hmacVerified`, `createdAt`, `processedAt`.
2. Upsert on callback; duplicate returns `200` with no side effects.
3. Apply order transition only if the current status allows it:
   `pending|failed → paid`, `paid` unchanged.
4. Re-verify amount and currency against the order before marking paid; mismatch
   logs a reconciliation alert and returns `200` without marking paid.
5. Link the ledger row to the order (`paymentAttempts`).

**Acceptance criteria.**
- Same callback twice → one ledger row, one transition, second is a no-op.
- Amount mismatch never yields `paid`.
- `paid` never becomes `failed` or `pending`.
- Ledger row is queryable by order and by provider transaction id.

**Tests.** Integration: replay, amount mismatch, terminal-state protection.

**Docs.** Payment state table and ledger fields.

**Guards.** Clean Code, Test, Docs.

---

### MVP-18 — Authoritative inquiry and admin sync

| Field | Value |
| --- | --- |
| Priority | P0 |
| Estimate | 1.0h |
| Dependencies | MVP-17 |
| Delivery day | Day 5 |
| Module | `payment`, `order` |

**Problem.** Webhooks can be delayed or lost. Support needs a way to ask the
provider what actually happened, and the return page needs the same truth.

**Scope / expected files.**
- `src/module/payment/payment.service.ts`
- `src/module/payment/payment.controller.ts`
- `src/module/order/order.controller.ts`

**Steps.**
1. `fetchStatus(providerTransactionId)` calls the confirmed inquiry endpoint.
2. Map provider status to local status; apply through the same guarded transition
   used by the webhook.
3. `POST /v1/order/admin/:id/sync-payment` (admin) triggers the inquiry and returns
   the resulting local state with a `changed` flag.
4. Rate-limit or debounce repeated manual syncs per order.
5. On provider error, return `502` and leave local state untouched.

**Acceptance criteria.**
- Inquiry can move `pending → paid` when the provider confirms success.
- Inquiry never downgrades `paid`.
- Provider error leaves state unchanged and reports `502`.
- Endpoint is admin-only and audited in `statusHistory`.

**Tests.** Unit with stubbed provider responses for success, failure, error.

**Docs.** Admin sync endpoint and when to use it.

**Guards.** Clean Code, Test, Docs.

---

### MVP-19 — Failure, expiry, cancel, and idempotent stock release

| Field | Value |
| --- | --- |
| Priority | P0 |
| Estimate | 1.5h |
| Dependencies | MVP-16, MVP-09 |
| Delivery day | Day 5 |
| Module | `order`, `payment` |

**Problem.** Unpaid card orders currently hold stock forever, and
`restoreStock` is a read-modify-write on a JSON string. A double cancel can
double-restore.

**Scope / expected files.**
- `src/module/order/order.service.ts`
- `src/module/order/order.model.ts` (`stockReleasedAt`)
- `src/module/payment/payment.service.ts`

**Steps.**
1. Add `paymentStatus: "expired"` and `"cancelled"` handling (additive enum).
2. Release stock inside a transaction only when `stockReleasedAt` is null; set it
   in the same update; conditional on the marker so the operation is idempotent.
3. Apply release on: payment failed, session expired, admin cancel, provider
   reported cancel.
4. Expiry sweep: lazy check on order read plus an admin-triggered sweep endpoint.
   A cron is **not** in scope; the TTL is `PAYMENT_ORDER_TTL_MINUTES`.
5. Never release stock for a paid order.
6. Do not downgrade `paid` when a late failure callback arrives.

**Acceptance criteria.**
- Cancelling twice restores once.
- Expired unpaid order restores once and is no longer payable.
- Paid order cancel does not restore stock.
- Bundle counter and product variants both restore correctly.
- `stockReleasedAt` is set atomically with the release.

**Tests.** Integration: double cancel, expiry, paid-cancel guard.

**Docs.** Order expiry policy and admin sweep endpoint.

**Guards.** Clean Code, Test, Docs.

---

## Phase 6 — Operations, tracking, tests (Day 6)

### MVP-20 — Payment method capability gating

| Field | Value |
| --- | --- |
| Priority | P0 |
| Estimate | 1.0h |
| Dependencies | MVP-03 |
| Delivery day | Day 6 |
| Module | `payment` |

**Problem.** The merchant may not have Mada, Apple Pay, Tabby, or Tamara
activated. Showing a method that always fails is worse than hiding it.

**Scope / expected files.**
- `config/env.service.ts`
- `src/module/payment/payment.service.ts`
- `src/module/payment/payment.controller.ts`

**Steps.**
1. Derive availability from configured integration IDs plus an explicit
   `PAYMOB_METHODS_ENABLED` list confirmed by the account manager.
2. `GET /v1/payment/methods` returns only enabled methods with labels
   (`card`, `mada`, `apple_pay`, `tabby`, `tamara`) and `cod: true`.
3. Reject a session request for a disabled method with `400`.
4. Do not infer activation from documentation; only from confirmed config.

**Acceptance criteria.**
- Disabled method is absent from the public list and rejected at checkout.
- Enabling a method in env makes it appear without a code change.
- No integration ID or secret is returned.

**Tests.** Unit: filtering and rejection.

**Docs.** Method matrix tied to blockers.

**Guards.** Clean Code, Test, Docs.

---

### MVP-21 — Admin order monitoring filters

| Field | Value |
| --- | --- |
| Priority | P0 |
| Estimate | 1.0h |
| Dependencies | MVP-11 |
| Delivery day | Day 6 |
| Module | `order` |

**Problem.** `GET /v1/order/admin` only pages. Staff cannot isolate unpaid or
failed orders, which is exactly what they need on launch day.

**Scope / expected files.**
- `src/module/order/order.service.ts`
- `src/module/order/order.validate.ts`
- `src/module/order/order.controller.ts`

**Steps.**
1. Add `orderStatus`, `paymentStatus`, `shippingStatus` query filters.
2. Add `sort` restricted to `createdAt` and `totalAmount`.
3. Return `{ orders, total, page, limit, currency }` (already the shape).
4. Validate enum values; unknown value → `400`.
5. Keep the existing route path and response fields.

**Acceptance criteria.**
- Filtering by `paymentStatus=paid` returns only paid orders.
- Invalid status returns `400`.
- Pagination totals reflect the filter.
- Default behaviour without filters is unchanged.

**Tests.** Unit/service test with an in-memory query mock or integration test.

**Docs.** Query parameter table.

**Guards.** Clean Code, Test, Docs.

---

### MVP-22 — Customer tracking API and timeline

| Field | Value |
| --- | --- |
| Priority | P0 |
| Estimate | 1.5h |
| Dependencies | MVP-11 |
| Delivery day | Day 6 |
| Module | `order` |

**Problem.** Customers currently get a raw order document. They need a tracking
view with status, carrier, tracking number, and history.

**Scope / expected files.**
- `src/module/order/order.service.ts`
- `src/module/order/order.controller.ts`
- `src/module/order/order.validate.ts` (if a query schema is needed)

**Steps.**
1. `GET /v1/order/:id/tracking` (owner or admin).
2. `GET /v1/order/track/:orderNumber` (owner only) for support-friendly links.
3. Respond with `orderNumber`, `orderStatus`, `paymentStatus`,
   `shippingStatus`, `shippingCarrier`, `trackingNumber`, `events[]`,
   `estimatedDelivery` (nullable), and `currency`.
4. Exclude internal fields, admin notes, provider references, and address beyond
   what the owner already sees.
5. Append a `viewed` event only if the team wants it; default is no write on read.

**Acceptance criteria.**
- Owner can track by id and by order number.
- Another user gets `404`.
- Events are in chronological order.
- No provider or admin-only field leaks.
- Order without shipping info returns nulls, not errors.

**Tests.** Integration: ownership, order-number lookup, field exclusion.

**Docs.** Tracking response example.

**Guards.** Clean Code, Test, Docs.

---

### MVP-23 — Essential test suite

| Field | Value |
| --- | --- |
| Priority | P0 |
| Estimate | 3.5h |
| Dependencies | MVP-08, MVP-09, MVP-16, MVP-17, MVP-19 |
| Delivery day | Day 6 |
| Module | cross-cutting |

**Problem.** Existing Jest tests cover validation, pricing helpers, and auth
middleware. Nothing covers money correctness for bundles, HMAC verification,
replay safety, or stock release. Those are the four places where a bug costs real
money.

**Scope / expected files.**
- `src/module/bundle/bundle.pricing.test.ts`
- `src/module/payment/paymob.hmac.test.ts`
- `src/module/payment/payment.replay.test.ts`
- `src/module/order/order.stock-release.test.ts`
- `cypress/e2e/checkout.cy.ts` (extend the existing suite)

**Steps.**
1. Bundle pricing: 6+ table cases, invalid option codes, discount cap.
2. HMAC: known vector, tampered body, missing signature.
3. Replay: duplicate callback is a no-op; amount mismatch never paid.
4. Stock release: double cancel restores once; paid order never restores.
5. E2E: product → cart → order (COD and mock card) → admin sees order → customer
   tracks it.

**Acceptance criteria.**
- All tests pass locally with `npm test` and `npm run cy:run`.
- The E2E test runs against `PAYMENT_PROVIDER=mock`, no real credentials needed.
- Test output is pasted in the PR, not summarized as "all good".
- Zero skipped tests without a written reason.

**Tests.** This ticket **is** the tests.

**Docs.** Testing section in the README: commands, mock mode, known limits.

**Guards.** Test.

---

## Phase 7 — Deploy, verify, document (Day 7)

### MVP-24 — Staging deployment and environment verification

| Field | Value |
| --- | --- |
| Priority | P0 |
| Estimate | 1.5h |
| Dependencies | MVP-23 |
| Delivery day | Day 7 |
| Module | ops |

**Steps.**
1. Deploy with production-like env: MongoDB, JWT secrets, `CURRENCY=SAR`,
   `PAYMENT_PROVIDER` per credential state.
2. Verify `/v1/health`, auth login, product list, cart, order creation.
3. Verify the webhook path is reachable over public HTTPS (or record that it is
   not).
4. Confirm no secret is present in client bundles or responses.

**Acceptance criteria.**
- Health check returns `{ status: "ok", currency: "SAR" }`.
- A test order is created and visible to admin.
- Webhook reachability is recorded as VERIFIED or BLOCKED.
- No `.env` value leaks in a response or log.

**Tests.** Manual smoke, recorded with request/response evidence.

**Docs.** Deployment section and required env list.

**Guards.** Docs.

---

### MVP-25 — Sandbox end-to-end payment attempt

| Field | Value |
| --- | --- |
| Priority | P0 |
| Estimate | 1.5h |
| Dependencies | MVP-24, MVP-16, MVP-17 |
| Delivery day | Day 7 |
| Module | external |

**Steps.**
1. If credentials and a public callback exist: create a real sandbox payment,
   complete it with test data, and confirm `paid` from the callback.
2. Replay the callback and confirm no state change.
3. Send a tampered callback and confirm `401`.
4. If credentials are missing: run the same flow with the mock adapter and record
   each of the six unverified items from the plan §12.

**Acceptance criteria.**
- Result is written as VERIFIED with evidence, or NOT TESTED with the exact
  missing input.
- No claim of "payment works" without a completed sandbox transaction.
- Blocker document updated with what remains.

**Tests.** Manual E2E, evidence in the delivery note.

**Docs.** `EXTERNAL_INTEGRATION_BLOCKERS.md`.

**Guards.** Docs.

---

### MVP-26 — Delivery documentation

| Field | Value |
| --- | --- |
| Priority | P0 |
| Estimate | 2.0h |
| Dependencies | All |
| Delivery day | Day 7 |
| Module | docs |

**Steps.**
1. Update `API_DOCUMENTATION.md`: bundles, specs, checkout modes, payment
   endpoints, tracking, admin filters.
2. Update `config/.env.example`: every new variable with a placeholder and a
   comment, no real values.
3. Write `docs/runbooks/PAYMENT_OPERATIONS.md`: how to sync a stuck payment, how
   to refund manually, expiry behaviour, what to do when a callback is missing.
4. Write the delivery note: what is verified, what is not, bundle inventory
   assumption, residual risks.
5. Keep `README.md` claims aligned with reality.

**Acceptance criteria.**
- A new developer can configure and run the project from docs alone.
- Every endpoint listed exists and matches the code.
- The delivery note contains the VERIFIED / NOT TESTED split.
- No document says "production-ready".

**Tests.** Docs review against the source; every referenced endpoint opened.

**Docs.** All of the above.

**Guards.** Docs.

---

## Post-launch (not in the 47 hours)

| ID | Ticket | Pri | Est | Blocker |
| --- | --- | --- | --- | --- |
| PL-01 | Refund/void admin automation with partial refunds | P1 | 4h | None; manual via dashboard first |
| PL-02 | Reconciliation cron and daily settlement report | P1 | 3h | None |
| PL-03 | Component-level bundle stock deduction | P1 | 6–8h | **DEC-01 unanswered** |
| PL-04 | Guest checkout + phone OTP order lookup | P1 | 6h | Product decision |
| PL-05 | Shipping carrier integration (labels, rates, webhooks) | P2 | TBD | No carrier contract or API credentials |
| PL-06 | `variants` JSON string → subdocument migration | P2 | 6h | Data migration plan |
| PL-07 | Money storage → `Decimal128` | P2 | 6h | Migration plan |
| PL-08 | Tabby integration | P2 | 8h | Merchant activation |
| PL-09 | Tamara integration | P2 | 8h | Merchant activation |
| PL-10 | Apple Pay domain verification + live test | P2 | 3h | Apple Developer + Paymob activation |
| PL-11 | Admin analytics summary (revenue, conversion) | P3 | 3h | None |

---

## Ticket execution order

```text
Day 1: 01 → 02 → 03 → 04
Day 2: 05 → 06 → 07 → 08
Day 3: 09 → 10 → 11
Day 4: 12 → 13 → 14 → 15
Day 5: 16 → 17 → 18 → 19
Day 6: 20 → 21 → 22 → 23
Day 7: 24 → 25 → 26
```

No ticket starts before its dependencies are merged. No ticket from this document
may be executed until the client approves it individually.
