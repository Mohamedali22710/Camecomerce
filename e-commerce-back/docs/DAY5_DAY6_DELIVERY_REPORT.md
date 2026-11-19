# Day 5 & Day 6 Delivery Report — Paymob Verification and Operations

| Field | Value |
| --- | --- |
| Date | 2026-11-19 |
| Scope | Day 5 (MVP-16…MVP-19) and Day 6 (MVP-20…MVP-23) |
| Provider | Paymob only (Intention API + Unified Checkout); Stripe removed |
| Regions | Explicit `eg` / `ksa`; no fallback, no cross-region credentials |
| Repository | `D:\freelance\e-commerce-back` |
| Git state | All changes uncommitted; no commit, push, reset, or clean was performed |
| Verdict | **READY WITH DOCUMENTED BLOCKERS** |

---

## 1. Verdict

The Day 5/6 code is complete and covered by typecheck, unit tests, and lint.
The frontend can integrate against the documented API contract now.

This is **not** a production-readiness claim for online payments. No request has
been sent to a real Paymob account, no real callback has been received, and no
sandbox payment has been completed. KSA behavior is untested. Those items are
external blockers, listed in §8.

**Why not "READY FOR FRONTEND INTEGRATION" alone?** The API is ready, but card
checkout should not be exposed to real customers until the Paymob blockers are
closed. "READY WITH DOCUMENTED BLOCKERS" states both facts without hiding the
provider risk.

---

## 2. What was delivered

### Day 5 — Payment verification

| Area | Delivered behavior |
| --- | --- |
| Webhook route | `POST /v1/payment/paymob/webhook` receives `express.raw` **before** `express.json`, so the exact bytes are preserved for JSON parsing |
| HMAC | HMAC-SHA512 over the fixed 20-field order from the parsed transaction object (`obj`), using `PAYMOB_HMAC_SECRET`; `hmac` query parameter; constant-time compare; `401` on missing/tampered signature |
| Parsing | The preserved body is parsed to `obj`; HMAC is verified before any transaction field is trusted; transaction and order callback shapes are handled defensively; raw payloads are never logged or stored |
| Ledger | `paymentTransaction` row per verified event, unique on `{ provider, providerTransactionId }`; payload stored only as a short SHA-256 digest |
| Settlement | Ledger insert, order transition, stock release, and audit history run in **one MongoDB transaction** |
| Replay | Duplicate callback aborts on the unique index and returns a no-op/`duplicate`; stock and status cannot change twice |
| Money checks | Amount is always derived from the persisted order in integer minor units; amount/currency mismatch never marks paid |
| Inquiry | Authenticated provider inquiry through the legacy API-key → auth-token → `GET /api/ecommerce/orders/{id}?token=` path; shared settlement path; debounced admin sync |
| Expiry | Lazy expiry on order/payment reads plus `POST /v1/order/admin/expire-sweep`; COD and paid orders excluded; `stockReleasedAt` makes release one-time |
| Late payment | If stock was released, the order becomes `reconciliation_required`; a dedicated admin reconcile endpoint requires `reacquireStock: true` before `paid` |
| Redirect safety | Return-URL/query parameters are ignored; only a verified webhook or authoritative inquiry can settle |

### Day 6 — Methods, admin operations, tracking, tests

| Area | Delivered behavior |
| --- | --- |
| Method discovery | `GET /v1/payment/methods` returns only enabled methods plus COD; no keys or integration IDs |
| Method gating | `PAYMOB_METHODS_ENABLED` and a non-empty integration ID are both required; default is `card`; Apple Pay, Tabby, and Tamara stay hidden |
| Admin filters | `GET /v1/order/admin` filters by `orderStatus`, `paymentStatus`, `shippingStatus`; sort restricted to `createdAt`/`totalAmount` and directions; unknown values rejected |
| Tracking | `GET /v1/order/track/:orderNumber` and `GET /v1/order/:id/tracking`; owner/admin checks; chronological timeline excluding sensitive fields |
| Tests | HMAC vector/tamper, method gating, filters, tracking, stock aggregation, expiry, settlement decisions, validation, registry, mock, lifecycle |
| Documentation | `docs/FRONTEND_INTEGRATION.md`, this report, and updates to README/API docs and implementation docs |

---

## 3. Ticket audit

Status vocabulary: **DONE**, **PARTIALLY DONE**, **NOT STARTED**, **BLOCKED**.
"Verification level" is deliberately separate from status.

### Day 5

| Ticket | Status | Verification level | Evidence / limitation |
| --- | --- | --- | --- |
| MVP-16 — Webhook raw route + HMAC | **DONE** | Unit only | Raw-buffer assertion, 20-field vector, valid signature, tampered body/signature, missing `hmac`. No real Paymob callback. |
| MVP-17 — Ledger + replay dedupe | **DONE** | Unit only | Unique provider transaction key, paid-terminal rule, mismatch decisions, duplicate handling. No MongoDB transaction executed in tests. |
| MVP-18 — Inquiry + admin sync | **DONE** | Mocked provider | Inquiry parsing, auth-token caching, debounce, shared settlement. No real inquiry request. |
| MVP-19 — Expiry + late payment | **DONE** | Unit only | Lazy expiry, sweep, one-time release, `reconciliation_required`, `reacquireStock`. No DB-backed replay/stock test. |

### Day 6

| Ticket | Status | Verification level | Evidence / limitation |
| --- | --- | --- | --- |
| MVP-20 — Method gating | **DONE** | Unit/code review | Explicit allow-list + integration-ID check; no secrets in response; disabled method returns `400` |
| MVP-21 — Admin filters | **DONE** | Unit/validation | Enum validation, restricted sort, pagination bounds |
| MVP-22 — Customer tracking | **DONE** | Unit/code review | Lookup by id/number, ownership `404`, chronological timeline, field exclusion |
| MVP-23 — Essential tests | **PARTIALLY DONE** | Unit suites only | Required unit suites exist. Cypress E2E and database-backed replay/stock tests were not added; no DB integration harness exists. |

### External tickets affecting this scope

| Ticket | Status | Reason |
| --- | --- | --- |
| MVP-03 — Paymob credential request | **BLOCKED** | No merchant account manager, credentials, or KSA account supplied |
| MVP-15 — Sandbox smoke run | **BLOCKED** | No credentials and no public HTTPS webhook URL |
| MVP-24 — Staging deploy | **BLOCKED** | No production/staging domain, TLS, or infrastructure access |
| MVP-25 — Real sandbox E2E | **BLOCKED** | Depends on MVP-03/MVP-15/MVP-24 |
| MVP-26 — Final delivery note | **PARTIALLY DONE** | This report and frontend contract exist; external verification rows cannot be closed |

---

## 4. Stripe removal

Stripe was removed permanently, not left as a rollback:

- Deleted the Stripe adapter, service, and its tests.
- Removed the Stripe registry case and the Stripe webhook mount.
- Removed the Stripe dependency from `package.json`.
- Removed Stripe configuration and the `PAYMENT_PROVIDER=stripe` path from
  `config/env.service.ts` and `config/.env.example`.
- Updated documentation to state Paymob-only.

This intentionally overrides older ticket clauses that kept Stripe as a rollback.
The conflict is recorded in `7_DAY_IMPLEMENTATION_TICKETS.md`.

Historical reports (`DAY_1_2_IMPLEMENTATION_REPORT.md`,
`DAY_3_4_IMPLEMENTATION_AND_SECURITY_REPORT.md`,
`DAY_5_PHASE_0_STABILIZATION_REPORT.md`) now carry a banner explaining that their
Stripe references describe an earlier snapshot.

---

## 5. Security and correctness invariants

1. A redirect or query parameter can never mark an order paid.
2. A webhook is accepted only after HMAC verification over the 20 documented
   fields in the parsed `obj`, with a constant-time comparison; raw bytes are
   preserved only to parse the exact payload.
3. A verified event is deduplicated by provider transaction ID before any status
   or stock write.
4. Amount and currency are re-checked against the persisted order.
5. `paid` is terminal and is never downgraded by a later callback.
6. Stock is released at most once, guarded by `stockReleasedAt`.
7. Late payment after release becomes `reconciliation_required`; it cannot mark
   paid or double-deduct without explicit `reacquireStock`.
8. Provider failures cancel the order and release stock once; no payable orphan.
9. Secrets, card data, and raw provider payloads are never returned or logged.
10. A bundle has no stock counter; component variants are reserved and released
    exactly once from the frozen order snapshot.

---

## 6. Verification evidence

Commands were run from `D:\freelance\e-commerce-back` on 2026-11-19.

| Command | Result |
| --- | --- |
| `npx tsc --noEmit` | **PASS** — exit 0, no diagnostics |
| `npx jest --silent --ci --runInBand` | **PASS** — 31/31 suites, 233/233 tests, 11.412 s |
| `npx eslint "src/**/*.ts"` | **PASS** — 0 errors, 24 warnings (all pre-existing `any`/import-order warnings) |

The 24 warnings are not new failures and do not block delivery. No test connects
to MongoDB, Paymob, or any network service.

### What each verification level means

| Level | Meaning |
| --- | --- |
| Unit | Pure logic and mocked models/HTTP; no I/O |
| Mocked provider | The `PaymentProvider` contract is exercised, not Paymob |
| Sandbox | A real Paymob test request/callback was executed |
| Live | Real money; explicitly out of scope |

Only the first two levels were reached for payments.

---

## 7. Frontend-facing contract

The integration sequence and error matrix are in
[`FRONTEND_INTEGRATION.md`](./FRONTEND_INTEGRATION.md). Summary:

1. `GET /v1/payment/methods` — choose only returned methods (COD is always
   available when enabled).
2. `POST /v1/order` with `paymentMethod: "cod"` or `"card"` and
   `paymentMethodCode` for online methods.
3. For card, use `redirectUrl` from the checkout response and redirect to Paymob
   Unified Checkout.
4. The return page may display a message but must call
   `GET /v1/payment/status/:orderNumber`; it must not treat query parameters as
   confirmation.
5. Poll status while `pending`; stop on `paid`, `failed`, `expired`,
   `cancelled`, or `reconciliation_required`.
6. A retry uses `POST /v1/payment/session` for a still-pending card order.

Relevant routes:

- `POST /v1/order`
- `GET /v1/order/mine`
- `GET /v1/order/:id`
- `GET /v1/order/admin`
- `POST /v1/order/admin/:id/sync-payment`
- `POST /v1/order/admin/:id/reconcile-payment`
- `POST /v1/order/admin/expire-sweep`
- `GET /v1/order/track/:orderNumber`
- `GET /v1/payment/methods`
- `POST /v1/payment/session`
- `GET /v1/payment/status/:orderNumber`
- `POST /v1/payment/paymob/webhook`

---

## 8. Blockers and untested behavior

| Item | State | Impact |
| --- | --- | --- |
| Real Paymob Intention API request | **NOT TESTED** | Request shape, auth header, and error mapping are unit-tested only |
| Real HMAC callback | **NOT TESTED** | Field order and secret behavior are verified only with a local known vector |
| Real transaction inquiry | **NOT TESTED** | Response parsing and auth-token flow are mocked |
| Public HTTPS webhook URL | **BLOCKED** | Paymob cannot call localhost; no real callback can arrive |
| Paymob credentials and integration IDs | **PARTIAL — NOT VERIFIED** | Egyptian API/secret/public keys and integration ID `6067` located; no sandbox request; HMAC secret validity, `6067` activation/method mapping, and KSA credentials remain unverified |
| KSA region | **NOT TESTED** | No KSA merchant account or credentials; Egypt success would not prove KSA |
| Mada | **BLOCKED** | Activation and integration ID not confirmed |
| Apple Pay | **BLOCKED** | Merchant activation plus domain verification file |
| Tabby / Tamara | **BLOCKED** | Separate merchant agreements and activation |
| Database-backed transactions/replay/stock | **NOT TESTED** | No MongoDB integration harness; transactional claims are code-reviewed and unit-tested only |
| Cypress E2E | **NOT STARTED** | Out of MVP-23 scope as delivered; remains a gap |
| Live payments | **OUT OF SCOPE** | No real charge was or should be attempted |

No production-readiness claim is made from any mock or unit result.

---

## 9. Documentation audit

All files under `docs/implementation/` were reviewed and corrected:

| Document | Action |
| --- | --- |
| `7_DAY_IMPLEMENTATION_TICKETS.md` | Status table through MVP-23; DEC-01 and Stripe conflict documented; stale bundle-counter and Stripe wording corrected; PL-03 closed |
| `7_DAY_MVP_PLAN.md` | Status, §6 inventory model, §11.1 contract, environment table, and approval updated to Paymob-only and component stock |
| `EXTERNAL_INTEGRATION_BLOCKERS.md` | Regional endpoint defaults marked IMPLEMENTED/NOT VERIFIED; Day 5/6 verification log added; DEC-01 resolved; sandbox/KSA explicitly not tested |
| `BUNDLE_COMPONENT_INVENTORY_DESIGN.md` | Changed from design-only to implemented; `cameras` snapshot and remaining DB-test gap recorded |
| `DAY_1_2_IMPLEMENTATION_REPORT.md` | Historical banner; Stripe statements superseded |
| `DAY_3_4_IMPLEMENTATION_AND_SECURITY_REPORT.md` | Historical banner; Stripe statements superseded |
| `DAY_5_PHASE_0_STABILIZATION_REPORT.md` | Historical banner; Stripe rollback adapter superseded |

Related root documents `README.md` and `API_DOCUMENTATION.md` were updated for
Paymob-only behavior, regional configuration, expiry, reconciliation, and the
current order/payment contract.

---

## 10. Deviations and decisions

| Decision | Reason |
| --- | --- |
| Stripe removed entirely | Day 5 brief overrides older rollback clauses |
| Bundle snapshot field named `cameras` | Matches the bundle model; avoids duplicate `components` shape |
| `reconciliation_required` added | Explicit state for late payment after stock release |
| Expiry is lazy + admin sweep, no cron/queue | No scheduler infrastructure; idempotent on read and sweep |
| Admin manual `paid` blocked after release | Prevents marking paid without reacquiring stock |
| Reconcile requires `reacquireStock: true` | Makes the stock consequence explicit and auditable |
| Inquiry uses legacy auth-token flow | Intention API does not expose order inquiry; documented path used |
| No real charges attempted | Sandbox credentials and authorization are absent |

---

## 11. Handoff

To move from **READY WITH DOCUMENTED BLOCKERS** to verified:

1. Provide a Paymob merchant account for the chosen region and test credentials
   (API key, secret key, public key, HMAC secret, card/mada integration IDs).
2. Provide a public HTTPS staging URL so Paymob can reach
   `/v1/payment/paymob/webhook`.
3. Run one sandbox card payment end to end, including a duplicate callback.
4. Reconcile the transaction through the admin sync endpoint.
5. Repeat in KSA only with KSA credentials; do not infer KSA from Egypt.
6. Add a MongoDB replica-set integration harness for transaction, replay, and
   stock-release tests before calling those behaviors verified.

Until then, online card checkout should remain hidden or limited to sandbox
testing; COD can operate independently.
