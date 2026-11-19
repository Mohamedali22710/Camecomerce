# Day 5 — Phase 0 Stabilization Report

> **Historical document (superseded 2026-11-19).** This report records the Phase 0
> state on 2026-11-18, when a Stripe adapter still existed as a rollback. Stripe
> was removed permanently during the Day 5 Paymob work. References below to
> `stripe.provider.ts`, `PAYMENT_PROVIDER=stripe`, or the Stripe webhook describe
> that earlier snapshot only. Current behavior: Paymob or mock, no Stripe. See
> [`../DAY5_DAY6_DELIVERY_REPORT.md`](../DAY5_DAY6_DELIVERY_REPORT.md).

| Field | Value |
| --- | --- |
| Date | 2026-11-18 |
| Scope | Phase 0 only (critical stabilization before Paymob work) |
| Base commit | `ae8230f` — "adding paymop and update cart order and fix securty" |
| Working tree | Changes **uncommitted** (16 modified, 4 new) |
| Typecheck | `npx tsc --noEmit` → **PASS** |
| Tests | `npx jest --silent --ci` → **24/24 suites, 163/163 tests passed**, 11.1 s |
| Cypress | Not run (shared Atlas; out of scope) |
| Database writes | None (no migrations, indexes, seeds, or data changes) |

---

## 1. Objective

Close the P0 findings from the pre-Day-5 backend audit so MVP-16 → MVP-19
(Paymob checkout, webhook, ledger, expiry) can start on a stable base.

Phase 0 deliberately **does not** implement Paymob checkout, the Paymob webhook,
the payment ledger, or the expiry sweep, and it invents no endpoint, credential,
HMAC rule, or integration ID.

---

## 2. Fix 1 — Transactions require a replica set, and connection failure is fatal

**Problem.** `dataBaseConnection()` swallowed connection errors, the server started
anyway, and the shipped example pointed at a standalone `mongod`. Every checkout
would then fail at `startTransaction()` with MongoDB error 20, at runtime, per
request.

**Change.**

| File | Change |
| --- | --- |
| `src/database/connection.ts` | Added `describeTransactionTopology()` (pure) and `assertTransactionCapableTopology()` (runs `hello`). Accepts `setName` (replica set) or `msg === "isdbgrid"` (mongos); throws an explicit error otherwise. `dataBaseConnection()` rethrows instead of swallowing. `MONGODB_URI` is now mandatory. |
| `src/index.ts` | Boot is now async: `assertEnv()` → `assertPaymentProviderConfig()` → `await dataBaseConnection()` → `app.listen()`. Any failure logs and `process.exit(1)`. |
| `config/env.service.ts` | `MONGODB_URI` has no standalone default (type `string \| undefined`) and is required by `assertEnv`. |
| `config/.env.example` | Replaced the standalone URI with an Atlas `mongodb+srv://` template plus local single-node replica-set instructions. |
| `src/seed-admin.ts` | Removed the standalone fallback; requires `MONGODB_URI`. |
| `README.md` | Documents the required URI and the boot topology guard. |

**Test.** `src/database/connection.test.ts` covers replica set, mongos, and
standalone rejection without opening a connection.

---

## 3. Fix 2 — Payment status model completed

**Problem.** The persisted enum was `pending | paid | failed`, while the frozen
provider contract already declared `expired` and `cancelled`. A Paymob timeout or a
voided attempt had nowhere to land.

**Change.**

| File | Change |
| --- | --- |
| `src/database/model/order.model.ts` | `PAYMENT_STATUSES` = `pending, paid, failed, expired, cancelled`. `paid` remains terminal. |
| `src/module/order/order.lifecycle.ts` | `PAYMENT_TRANSITIONS`: `pending → paid \| failed \| expired \| cancelled`; `paid → []`; `failed → paid \| cancelled`; `expired → paid \| cancelled`; `cancelled → []`. Allows only provider-authoritative late confirmations, never a downgrade from `paid`. |
| `src/module/payment/payment.service.ts` | `nextActionFor` maps `paid`/`cancelled → none`, `failed`/`expired → contact_support`. |
| `src/module/payment/payment.types.ts` | Contract comment now reflects that it is the shared adapter boundary. |

`order.validate.ts` consumes the model enum, so the admin endpoint accepts the two
new values without further change.

---

## 4. Fix 3 — `PAYMENT_PROVIDER` actually controls checkout

**Problem.** `createOrder` imported the Stripe service directly. Setting
`PAYMENT_PROVIDER=paymob` still created Stripe sessions, and a failing checkout
left reserved stock behind when the provider was unavailable.

**Change.**

| File | Change |
| --- | --- |
| `src/module/payment/stripe.provider.ts` **(new)** | Legacy Stripe adapter implementing the frozen `PaymentProvider` contract: `createSession` reuses the existing hosted-checkout code; `verifyAndParse` / `fetchStatus` return `HttpError(501)` so webhooks stay on `/v1/order/webhook`. |
| `src/module/payment/payment.registry.ts` | `case "stripe"` returns the adapter instead of throwing; Paymob still validates config and preserves its explicit `503`. |
| `src/module/order/order.service.ts` | Removed the direct Stripe import. The adapter is resolved **before** any write, so a misconfigured provider cannot create an order holding stock. `CreateSessionInput` is built with minor units, customer data, notification/redirection URLs. On session failure the order is cancelled and stock released once, then the provider's `503`/`502` is returned. Persists `paymentProvider` + `paymentReference` after success. Response adds `redirectUrl`, `provider`, `paymentStatus` alongside the existing `url`. |
| `config/env.service.ts` | Default provider changed from `stripe` to `paymob`; a missing variable can no longer silently select Stripe. |
| `config/.env.example` | `PAYMENT_PROVIDER=paymob`, with `mock` for local development and `stripe` marked rollback-only. |

**Test.** `payment.registry.test.ts` asserts the Stripe adapter is returned and that
its unimplemented operations reject with `501`.

---

## 5. Fix 4 — Cancellation, stock release, and history are one atomic unit

**Problem.** `updateOrderStatus` saved the status first, then claimed the stock
release in a second transaction. A crash between the two left a `cancelled` order
with `stockReleasedAt = null` and no repair path, and stock restoration was not
guarded against a paid order.

**Change.**

| File | Change |
| --- | --- |
| `src/module/order/order.service.ts` | `updateOrderStatus` now runs one transaction: read order → re-plan → conditional `findOneAndUpdate` (optimistic guards on every changed field + `stockReleasedAt: null` + `paymentStatus: {$ne: "paid"}`) → `restoreProductStock()` → `$push` history → commit. `releaseOrderStockOnce` deleted (folded in). `cancelOrderAndReleaseStock` filter now also requires `paymentStatus: {$ne: "paid"}`. `restoreProductStock` throws `HttpError(409)` on a missing product or variant instead of silently `continue`. |
| `src/module/order/order.lifecycle.ts` | `releaseStock` = target `cancelled` ∧ marker still `null` ∧ current payment not `paid` ∧ the same request does not settle it as `paid`. This enables **recovery** of an already-cancelled order whose marker is `null`, while a request that marks the payment paid in the same write never restocks. |

Guarantees:

* two concurrent cancellations cannot both restore (the claim is re-evaluated by
  MongoDB inside the write; the loser gets `409`);
* a paid order is never restocked;
* a failed claim aborts the status/history write too, so the marker and the status
  can never disagree;
* `typescript` no longer silently loses inventory when a product/variant is gone.

**Test.** `order.lifecycle.test.ts` covers first cancellation, already released,
recovery, paid, paid-and-cancelled, cancel-and-pay-in-one-request, and the new
`expired`/`cancelled` payment states.

---

## 6. Fix 5 — Bundle inventory design (design only)

New `docs/implementation/BUNDLE_COMPONENT_INVENTORY_DESIGN.md` records the approved
model:

* admin selects component products/quantities and sets the final bundle price
  manually;
* bundle sales deduct component quantities from normal product inventory;
* requirements are **aggregated by variant across the whole order** before
  validation;
* insufficient component stock blocks checkout;
* restoration uses a **frozen component snapshot** on the order line, once, via
  the Phase 0 `stockReleasedAt` claim;
* **no independent bundle stock counter** and no `stock` field on the bundle.

No schema, endpoint, migration, or stock behaviour from that document is
implemented in Phase 0.

---

## 7. Fix 6 — Broken test repaired

`src/module/bundle/bundle.admin.test.ts` did not compile: missing `expect` import
and an untyped `it.each` callback. It now imports its globals from
`@jest/globals`, types the callback as `(role: string)`, and types the mocked
`res.status` with its code parameter so `toHaveBeenCalledWith(403)` is valid.
The suite passes (3/3).

---

## 8. Files

**Modified (16)**

```
API_DOCUMENTATION.md
README.md
config/.env.example
config/env.service.ts
src/database/connection.ts
src/database/model/order.model.ts
src/index.ts
src/module/bundle/bundle.admin.test.ts
src/module/order/order.lifecycle.test.ts
src/module/order/order.lifecycle.ts
src/module/order/order.service.ts
src/module/payment/payment.registry.test.ts
src/module/payment/payment.registry.ts
src/module/payment/payment.service.ts
src/module/payment/payment.types.ts
src/seed-admin.ts
```

**New (4)**

```
docs/implementation/BUNDLE_COMPONENT_INVENTORY_DESIGN.md
docs/implementation/DAY_5_PHASE_0_STABILIZATION_REPORT.md   (this file)
src/database/connection.test.ts
src/module/payment/stripe.provider.ts
```

---

## 9. Verification actually executed

| Command | Result |
| --- | --- |
| `npx tsc --noEmit` | PASS (0 errors) |
| `npx jest --silent --ci` | 24/24 suites, 163/163 tests passed, 11.1 s |
| `git status --porcelain=v1` | 16 modified, 4 new, nothing staged |
| `git log --oneline -n 1` | `ae8230f adding paymop and update cart order and fix securty` |

Notes:

* Jest never connects to MongoDB; only `connection.ts`, `index.ts`, and
  `seed-admin.ts` call `mongoose.connect`, and none of them is exercised by a
  test that opens a connection.
* `tsconfig.json` excludes `**/*.test.ts`, so `tsc --noEmit` does not typecheck
  tests; the Jest run does (ts-jest), which is how the repaired test was caught.
* No Cypress, migration, index, seed, or production-data command was run.

---

## 10. Remaining blockers (carried into MVP-16 → MVP-19)

Not Phase 0 regressions; these are pre-existing P1 items:

1. Paymob endpoints / HMAC field list / credentials unconfirmed — adapter stays `503`.
2. Cart clear happens outside the order transaction (`deleteMany({userId})`), and an
   idempotency replay cannot heal a failed cart clear.
3. No transaction retry (`TransientTransactionError` still surfaces as `500`).
4. No payment ledger — `paymentAttempts` remains empty.
5. Failed/expired payments never release stock (MVP-19 sweep).
6. Cart index conflict / `itemType` backfill still pending.
7. Order serialization still exposes `paymentReference` / `idempotencyKey`.
8. Bundle component inventory is design-only (see the new design document).

---

## 11. Phase 1 (Day 5 Paymob) readiness

**GO — with the P1 items tracked inside MVP-16 → MVP-19.**

Phase 0 exit criteria are met: the process cannot start without a
transaction-capable database, the payment status model matches the frozen
contract, `PAYMENT_PROVIDER` is the single source of truth for card checkout,
cancellation + release + audit are atomic and idempotent, and the test suite is
green. No Paymob behaviour was invented; the adapter remains an explicit `503`
until endpoints and credentials are confirmed.
