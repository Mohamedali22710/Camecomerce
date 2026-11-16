# 7-Day MVP Delivery Plan — CCTV E-Commerce Backend

| Field | Value |
| --- | --- |
| Status | Approved. Day 1–2 executed 2026-11-16: MVP-01, MVP-02, MVP-04, MVP-08 complete; MVP-05/06/07 complete except the DEC-01 inventory subset; MVP-03 BLOCKED. No Day 3+ ticket executed. |
| Plan date | 2026-11-16 |
| Repository | `D:\freelance\e-commerce-back` (branch `main`) |
| Baseline commit | `7980051` (Zod + Jest migration), plus uncommitted workflow file |
| Delivery window | 7 calendar days, Day 1 = 2026-11-16, Day 7 = 2026-11-22 |
| Capacity | 1 developer (backend only), **47 usable hours** |
| Related documents | `7_DAY_IMPLEMENTATION_TICKETS.md`, `EXTERNAL_INTEGRATION_BLOCKERS.md` |

> **Claims policy.** This repository uses three labels: **VERIFIED** (proven by a
> command or an HTTP request), **INSPECTED** (read in source, not executed),
> **NOT TESTED** (integration not configured). No document in this repository may
> call the store or a payment integration "production-ready" unless a real
> merchant-credential callback has been verified.

---

## 1. Business constraint

The client expects a CCTV e-commerce store inspired by Silken, delivered in
**7 calendar days**. The store must sell individual CCTV products and curated
camera packages (bundles), take payment through Saudi payment methods, and give
both the customer and the admin a working order workflow.

This is a time-constrained delivery. The plan deliberately prefers an
end-to-end working business flow over architectural completeness. Anything that
does not help a customer place a correct, payable order — or help staff fulfil
it — is post-launch.

---

## 2. Capacity model

The single developer has 47 usable hours across the window. Overhead for
environment issues, standups, context switching, and review is already deducted;
47h is net delivery time, not calendar time.

| Day | Date (indicative) | Usable hours | Cumulative |
| --- | --- | --- | --- |
| Day 1 | Mon 2026-11-16 | 6.5 | 6.5 |
| Day 2 | Tue 2026-11-17 | 6.5 | 13.0 |
| Day 3 | Wed 2026-11-18 | 7.0 | 20.0 |
| Day 4 | Thu 2026-11-19 | 7.0 | 27.0 |
| Day 5 | Fri 2026-11-20 | 7.0 | 34.0 |
| Day 6 | Sat 2026-11-21 | 7.0 | 41.0 |
| Day 7 | Sun 2026-11-22 | 6.0 | **47.0** |

Rules that follow from this table:

1. No ticket is scheduled unless its estimate fits the remaining hours that day.
2. The 1 hour on Day 7 is the only reserve. If Day 4 or Day 5 overruns, Day 6
   features are cut, not payment verification.
3. Working outside the 47h is a schedule change, not a plan adjustment, and must
   be reported explicitly rather than absorbed silently.
4. Dates are calendar days. If a rest day is taken, the delivery date moves; the
   plan is not quietly compressed.

### Why 47h and not 56h

Eight hours × 7 days assumes zero overhead and zero context loss. That is not a
realistic single-developer capacity. Planning at 56h would guarantee a Day 7
overrun, and an overrun on the verification day is the worst place to discover
the plan was fiction.

---

## 3. What "launch" means for this MVP

Launch is the point at which all of the following are demonstrable on a staging
deployment:

1. A customer can browse active products and bundles, with technical
   specifications and correct SAR pricing.
2. A customer can add products or a configured bundle to the cart, check out, and
   receive an order with server-computed totals (client-supplied prices are never
   trusted).
3. Stock is reserved transactionally and released exactly once when an order is
   cancelled or an unpaid card order expires.
4. Paymob KSA integration is implemented and configurable. If merchant
   credentials are available, a sandbox payment is verified end to end. If they
   are not, the same code path is exercised against the mock adapter and every
   unverified item is listed in `EXTERNAL_INTEGRATION_BLOCKERS.md`.
5. COD remains available as an additional method and a fallback. It does not
   replace Paymob.
6. An admin can list, filter, and update orders without breaking payment or
   shipping state.
7. A customer can retrieve their order tracking status and timeline.
8. Delivery documentation states exactly what was verified and what was not.

Launch does **not** mean: refunds automated, carrier integration, guest checkout,
Tabby/Tamara live, or production payment credentials validated.

---

## 4. In-scope work (47 hours)

| # | Workstream | Tickets | Hours |
| --- | --- | --- | --- |
| 1 | Foundation, baseline verification, payment contracts | MVP-01, MVP-02 | 4.0 |
| 2 | Paymob credential request and capability matrix (non-code) | MVP-03 | 1.0 |
| 3 | Product technical specifications + brand | MVP-04 | 1.5 |
| 4 | Fixed bundles: model, admin API, public read, option pricing, cart + order resolution, availability | MVP-05 to MVP-09 | 10.0 |
| 5 | Checkout and order integrity: cart→order, order number, timeline, guarded transitions | MVP-10, MVP-11 | 3.5 |
| 6 | Paymob KSA integration: session, webhook, ledger, inquiry, failure/expiry | MVP-12 to MVP-19 | 14.0 |
| 7 | Method gating, admin monitoring, customer tracking | MVP-20 to MVP-22 | 3.5 |
| 8 | Essential tests | MVP-23 | 3.5 |
| 9 | Staging deploy + sandbox E2E attempt | MVP-24, MVP-25 | 3.0 |
| 10 | Delivery documentation | MVP-26 | 2.0 |
| 11 | Reserve | — | 1.0 |
| | **Total** | **26 tickets** | **47.0** |

Per-day allocation is in §7; per-ticket detail is in
`7_DAY_IMPLEMENTATION_TICKETS.md`.

---

## 5. Explicitly out of scope

These are recorded so nobody mistakes absence for oversight. Each has a reason,
and none is required for the first launch flow.

| Item | Reason | Revisit |
| --- | --- | --- |
| Component-level bundle stock deduction | Business rule unresolved (DEC-01) | Post-launch, +6–8h |
| Refund / void automation | Manual through the Paymob dashboard is acceptable for launch volume | Post-launch, 4h |
| Reconciliation cron / daily settlement report | Manual admin "sync payment status" covers launch | Post-launch, 3h |
| Admin date-range and free-text order search | Status filters cover launch operations | Post-launch, 2h |
| Guest checkout | Auth-only checkout is already implemented and tested | Post-launch, 6h |
| Shipping carrier API integration | No carrier contract, API credentials, or rate agreement exists | Blocked externally |
| `variants` JSON-string → subdocument migration | Risky data migration, no launch value | Post-launch, 6h |
| Money storage → `Decimal128` | `roundMoney` + integer minor units at the payment boundary is sufficient for MVP | Post-launch, 6h |
| Tabby / Tamara live integration | Requires separate merchant agreements and activation | Blocked externally |
| Returns portal, reviews, coupons, wishlist enhancements | Not in the client's launch scope | Backlog |
| Frontend implementation | Out of backend scope; API contracts are documented instead | Separate track |

---

## 6. Bundle inventory assumptions (open business decision DEC-01)

Fixed bundles are in scope: a **4-camera package** and an **8-camera package**,
each with:

- HDD capacity options: **1TB** and **2TB**.
- Installation options: **without installation** and **with installation in
  Riyadh**.

All prices are computed and all option selections are validated **server-side**.
The client never supplies a price or an option code that the server has not
whitelisted.

### 6.1 Assumptions used by the MVP implementation

1. A bundle is its **own sellable unit** with its own admin-managed availability
   counter. It is not a virtual view over component products.
2. Selling a bundle does **not** decrement camera, HDD, or accessory variant
   stock in the MVP.
3. HDD capacity and installation are **selection and pricing attributes**, not
   stock-deducting components. Each option carries a server-side price delta.
4. Total price = bundle base price + HDD delta + installation delta. Discounts, if
   any, are applied server-side only.
5. Component products referenced by a bundle are treated as descriptive
   metadata for the storefront (what the customer receives), not as inventory
   reservations.

### 6.2 Consequence the business must accept

Bundle sales and component SKU stock can drift apart. If the store sells 3 of a
4-camera bundle, the individual camera product pages still show the old stock
until someone reconciles them. During the MVP this is a **manual operational
task**, documented in the payment/operations runbook.

### 6.3 Decision required

> **DEC-01:** Does selling a bundle deplete the stock of its component products
> and the selected HDD variant?

| Answer | Impact | Effort |
| --- | --- | --- |
| No (default if unanswered) | Ship MVP as described; manual reconciliation | 0h, inside 47h |
| Yes | Derived availability, transactional multi-line deduction, bundle-aware release on cancel/expiry | **+6 to +8h, does not fit 47h** |

**Owner:** client. **Deadline:** end of Day 3. **If unanswered by Day 3:** the
MVP ships with assumption 1 above, and the drift risk is recorded in the delivery
note. No component-level deduction code will be written before the decision is
recorded in this document.

---

## 7. Day-by-day schedule

Each day's exit criteria are binary. If an exit criterion is not met, the day's
remaining work moves to the reserve or is cut — it is not carried silently.

### Day 1 — 6.5h — Foundation and contracts

| Ticket | Work | Hours |
| --- | --- | --- |
| MVP-01 | Baseline `typecheck`/tests/lint, then freeze order/payment/envelope field contract and env contract | 2.0 |
| MVP-02 | `payment/` module skeleton: `PaymentProvider` interface + mock adapter | 2.0 |
| MVP-03 | Paymob KSA credential request pack and capability matrix sent to account manager | 1.0 |
| MVP-04 | Product `specifications` + `brand` (model, Zod, serialization, admin input) | 1.5 |

**Exit:** contract frozen in a short ADR note; mock adapter returns a session with
the same shape as the real one; credential request sent; specs visible on a
product response.

### Day 2 — 6.5h — Bundles

| Ticket | Work | Hours |
| --- | --- | --- |
| MVP-05 | Bundle model: components, HDD options, installation options, own availability | 1.5 |
| MVP-06 | Admin CRUD for bundles (create, update, list, soft-delete) | 3.0 |
| MVP-07 | Public bundle listing and detail (active only) | 1.0 |
| MVP-08 | Option validation + server-side total calculation | 1.0 |

**Exit:** an admin can create a 4-camera and an 8-camera bundle with both HDD and
both installation options; the public endpoint returns computed SAR totals.

### Day 3 — 7.0h — Checkout and order integrity

| Ticket | Work | Hours |
| --- | --- | --- |
| MVP-09 | Bundle cart lines, order-line resolution, availability decrement | 3.5 |
| MVP-10 | Cart→order checkout, cart clear on success | 1.5 |
| MVP-11 | Human-readable `orderNumber`, `statusHistory`, guarded status transitions | 2.0 |

**Exit:** a bundle in the cart produces the exact totals from Day 2, the order
snapshots the selection, decrements the bundle counter once, clears the cart, and
records initial history. **DEC-01 answered or defaulted here.**

### Day 4 — 7.0h — Paymob integration starts

| Ticket | Work | Hours |
| --- | --- | --- |
| MVP-12 | Paymob config, auth client, SAR→halalas conversion | 2.0 |
| MVP-13 | Intention/session creation with billing data and callback URLs | 3.0 |
| MVP-14 | Redirect/return contract + payment-status endpoint skeleton | 1.5 |
| MVP-15 | Sandbox smoke run (real test credentials if available, otherwise mock) | 0.5 |

**Exit:** a Paymob session is created for a real order, or the mock adapter is
exercised with an identical payload and the missing-credential blocker is
recorded.

### Day 5 — 7.0h — Paymob verification path

| Ticket | Work | Hours |
| --- | --- | --- |
| MVP-16 | Raw webhook route + HMAC-SHA512 verification | 2.5 |
| MVP-17 | Payment ledger + replay dedupe | 2.0 |
| MVP-18 | Authoritative transaction inquiry + admin "sync payment" | 1.0 |
| MVP-19 | Failure/expiry/cancel handling + idempotent stock release | 1.5 |

**Exit:** valid callback → `paid` once; replayed callback → `200`, no change;
tampered signature → `401`, no change; unpaid expired order releases stock once.

### Day 6 — 7.0h — Operations, tracking, tests

| Ticket | Work | Hours |
| --- | --- | --- |
| MVP-20 | Payment-method capability gating (mada/Visa/Apple Pay/Tabby/Tamara) | 1.0 |
| MVP-21 | Admin order monitoring: status filters | 1.0 |
| MVP-22 | Customer tracking API + timeline | 1.5 |
| MVP-23 | 4 unit tests + 1 end-to-end flow test | 3.5 |

**Exit:** only activated methods are returned to the storefront; customer can
track their order; tests pass and are run, not assumed.

### Day 7 — 6.0h — Deploy, verify, document

| Ticket | Work | Hours |
| --- | --- | --- |
| MVP-24 | Staging deploy + environment verification | 1.5 |
| MVP-25 | Sandbox E2E attempt and defect fixes | 1.5 |
| MVP-26 | API docs, `.env.example`, payment runbook, delivery note | 2.0 |
| Reserve | Overrun absorption only | 1.0 |

**Exit:** staging health check passes; end-to-end flow demonstrated (or payment
marked NOT TESTED with the exact reason); documents updated; handoff note signed.

---

## 8. Go / no-go gates

| Gate | When | Question | If the answer is no |
| --- | --- | --- | --- |
| G1 | End of Day 1 | Are Paymob KSA credentials requested, and is the payment contract frozen? | Continue; payment contract still freezes; escalate credentials |
| G2 | End of Day 3 | Do bundle totals and option validation match on a real request? | Stop feature work; fix before payment starts |
| G3 | End of Day 4 | Is a session created (real or mock) with correct amount in halalas? | Use Day 5 morning to finish; cut MVP-21 and MVP-22 (ops/tracking) |
| G4 | End of Day 5 | Does a verified callback mark paid, and does a replay do nothing? | Day 6 tests slip; payment verification takes priority over tracking |
| G5 | End of Day 7 | Is the flow demonstrated on staging and documented? | Launch is COD-only with Paymob marked NOT TESTED. This must be stated to the client in writing |

G5 is not a failure of the plan; it is the honest outcome when external
credentials are missing.

---

## 9. Definition of done (every ticket)

A ticket is done only when all of the following are true:

1. `npm run typecheck` passes.
2. `npm run lint` has no new errors.
3. `npm test` passes, and the ticket's own tests are included.
4. Acceptance criteria are demonstrated by a command or an HTTP request — not by
   reading the code.
5. Documentation touched by the change is updated in the same change set.
6. No secret, API key, HMAC value, card data, or full callback payload is written
   to the repository or to logs.
7. Existing endpoints keep their current behaviour unless the ticket explicitly
   changes them.
8. Any limitation is written down. "Works" without evidence is not a status.

---

## 10. Risk register

| # | Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- | --- |
| R1 | Paymob KSA credentials or Mada activation not available by Day 4 | High | Payment cannot be verified | Mock adapter with identical contract; blocker file; COD fallback; no false claims |
| R2 | Paymob HMAC field order or endpoint differs from public documentation | Medium | Day 5 overrun | Isolate verification in one module; ask account manager for the field list; unit-test with a known vector |
| R3 | Real callback requires public HTTPS; staging has none | Medium | E2E blocked | Tunnel on Day 7; otherwise mark NOT TESTED |
| R4 | DEC-01 answered "yes" after Day 3 | Medium | +6–8h | Recorded as Day 8 requirement; no silent absorption |
| R5 | Bundle option pricing logic drifts from approved prices | Medium | Wrong money charged | Single pricing function, unit-tested, DB is the only price source |
| R6 | Stock release double-applies on concurrent cancel | Low | Inventory corruption | `stockReleasedAt` marker inside a transaction; conditional update |
| R7 | Existing uncommitted work is lost | Low | Lost audit history | No reset/clean/checkout; preserve `BACKEND_CODE_AUDIT_CCTV.md` and `OPENCODE_CHANGE_REPORT.md` deletions as-is |
| R8 | Scope creep from storefront requests | High | Schedule loss | Requests go to the post-launch table; only launch blockers enter the 47h |

---

## 11. Payment security invariants (non-negotiable)

These hold even if the schedule slips. A payment day may extend; these may not be
weakened.

1. **Never mark an order paid from a browser redirect or return URL.** Paid state
   comes only from a verified provider callback or an authoritative server-side
   status check.
2. **Verify signature before parsing business data.** Invalid signature returns
   `401` and changes nothing.
3. **Re-verify amount and currency** against the stored order before transitioning
   to `paid`.
4. **`paid` is terminal.** It is never downgraded by a later callback.
5. **Deduplicate by provider transaction ID** with a unique index. Duplicate
   callbacks return `200` and are no-ops.
6. **All provider secrets stay server-side.** No key is returned to the client,
   embedded in a URL, or logged.
7. **Provider references only.** No card number, CVV, or expiry is ever stored;
   hosted checkout keeps the integration in SAQ A scope.

## 11.1 Frozen payment contract (MVP-01, applied 2026-11-16)

**Status:** contract frozen in `src/module/payment/payment.types.ts`. No order
route has been migrated onto it; the existing Stripe card path and all existing
responses are unchanged.

### Checkout response envelope

```json
{
  "orderId": "507f1f77bcf86cd799439011",
  "orderNumber": "CCTV-261116-0001",
  "paymentStatus": "pending",
  "redirectUrl": "https://provider.example/checkout/...",
  "provider": "mock"
}
```

`redirectUrl` is `null` when a provider returns only a browser-side secret.

### Provider interface

`PaymentProvider` exposes:

- `createSession(input)` — returns `{ provider, providerReference,
  providerTransactionId, amountMinor, currency, paymentStatus, redirectUrl,
  clientSecret }`.
- `verifyAndParse(rawBody, headers)` — verifies the signature before parsing and
  returns a `VerifiedPaymentEvent`.
- `fetchStatus(providerReference)` — authoritative inquiry.
- `refund?(input)` — optional, post-launch.

Amounts cross this boundary as **integer minor units** (halalas). A provider
reference is the only reference persisted; card data is never part of the
contract.

### Environment contract

| Variable | State | Meaning |
| --- | --- | --- |
| `PAYMENT_PROVIDER` | implemented | `mock` \| `paymob` \| `stripe` (legacy order path) |
| `PAYMOB_ENV` | planned (MVP-12) | `sandbox` \| `live`; values unconfirmed |
| `PAYMOB_API_KEY` | planned (MVP-12) | server-side only |
| `PAYMOB_SECRET_KEY` | planned (MVP-12) | server-side only |
| `PAYMOB_PUBLIC_KEY` | planned (MVP-12) | checkout only |
| `PAYMOB_HMAC_SECRET` | planned (MVP-16) | webhook verification |
| `PAYMOB_BASE_URL` | planned (MVP-12) | **UNCONFIRMED** for KSA |
| `PAYMOB_CHECKOUT_URL` | planned (MVP-12) | **UNCONFIRMED** |
| `PAYMOB_INTEGRATION_ID_*` | planned (MVP-13) | only activated methods are sent |
| `PAYMENT_ORDER_TTL_MINUTES` | planned (MVP-19) | unpaid-order expiry window |

`PAYMENT_PROVIDER=mock` is development-only and the process refuses to boot with
that combination when `NODE_ENV=production`. The mock adapter proves the
contract, never the provider.

---

## 12. What will be reported as unverified

Unless exercised with real credentials, the delivery note will list these as
**NOT TESTED**, in these words:

- Paymob intention/session creation against the merchant's live configuration.
- Mada rendering and completion at checkout.
- Apple Pay domain verification and payment completion.
- Tabby and Tamara availability and completion.
- HMAC verification against a real Paymob callback for this merchant account.
- Transaction inquiry and refund/void against real transactions.

A mock adapter proves the contract, not the provider. The difference is stated
explicitly in every handoff.

---

## 13. Approval

- **Plan approved for documentation:** yes, 2026-11-16.
- **Implementation approved:** **no.** Each ticket requires separate approval.
- **Bundle business decision DEC-01:** open, due end of Day 3.
- **Next action after approval:** execute MVP-01 only.
