# CCTV E-Commerce — Backend Engineering Workflow (7-Day Delivery)

> **Historical planning document.** The baseline audit in this file says there is
> "no Paymob code at all — only Stripe." That was true when written, not now.
> Paymob is implemented and Stripe was removed on 2026-11-19. Use
> [`docs/implementation/7_DAY_MVP_PLAN.md`](docs/implementation/7_DAY_MVP_PLAN.md)
> and [`docs/DAY5_DAY6_DELIVERY_REPORT.md`](docs/DAY5_DAY6_DELIVERY_REPORT.md) for
> current status.

**Role:** Backend engineer and software architect
**Repository:** `D:\freelance\e-commerce-back`
**Stack:** Node.js 24+, TypeScript (ESM), Express 5, MongoDB/Mongoose 9, Zod, Jest, Cypress
**Document status:** Active workflow. Supersedes the original three-stage,
open-ended workflow.

---

# NEW BUSINESS CONSTRAINT — 7-DAY DELIVERY

The client expects a CCTV e-commerce store inspired by Silken, with an initial
delivery deadline of **7 days**.

This is now a time-constrained delivery project.

## Immediate instructions

1. Perform a focused audit, not an unnecessarily lengthy repository review.
2. Verify existing implementations before creating tasks.
3. Do not repeat completed Zod, Jest, Auth, or Product work.
4. Separate essential launch functionality from post-launch enhancements.
5. Prioritize working end-to-end business flows over architectural perfection.

## Payment integration priority

The client needs Saudi payment methods. Investigate Paymob's Saudi integration
and its official documentation:

- Saudi Arabia payment environment.
- Mada.
- Visa / Mastercard.
- Apple Pay.
- Tabby.
- Tamara.
- Payment session creation.
- Webhook verification.
- Payment status synchronization.
- Idempotency.
- Failed and expired payment handling.
- Refund and cancellation behavior.

Rules:

- Do not assume that an Egypt Paymob integration is compatible with the Saudi
  environment. In this repository there is no Paymob code at all — only Stripe —
  so Paymob is greenfield.
- Do not assume that the merchant account has every payment method activated.
- Identify the required merchant credentials and onboarding requirements.
- Keep all secret credentials server-side.
- Never mark an order as paid based on a browser redirect.
- Payment confirmation must rely on verified provider notifications or an
  authoritative server-side status check.

## 7-day MVP scope

1. Product catalog and categories.
2. Product technical specifications.
3. Bundle options and server-side pricing.
4. Cart and checkout.
5. Order creation and stock consistency.
6. Paymob Saudi payment integration, subject to merchant credentials.
7. Admin order monitoring APIs.
8. Customer order tracking APIs.
9. Essential tests and delivery documentation.

Shipping carrier automation, and any payment method requiring unavailable merchant
activation, must be identified as a blocker or a post-launch item.

---

# Operating principles

1. **Working flow beats architectural completeness.** A customer must be able to
   order and pay before the code is made elegant.
2. **Verify before claiming.** Read the code, then run it. A claim without a
   command or an HTTP request is marked INSPECTED, not VERIFIED.
3. **Never fake payment readiness.** A mock adapter proves a contract, not a
   provider.
4. **Additive changes only in this window.** No risky migrations, no renames of
   existing fields, no breaking response shapes.
5. **Every cut is written down.** Deferred work goes to a ticket, not into silent
   absence.
6. **One developer, 47 usable hours.** Capacity is the planning constraint, not an
   afterthought.

## Delivery capacity

| Day | Usable hours | Cumulative |
| --- | --- | --- |
| Day 1 | 6.5 | 6.5 |
| Day 2 | 6.5 | 13.0 |
| Day 3 | 7.0 | 20.0 |
| Day 4 | 7.0 | 27.0 |
| Day 5 | 7.0 | 34.0 |
| Day 6 | 7.0 | 41.0 |
| Day 7 | 6.0 | **47.0** |

Overhead is already deducted. No ticket is scheduled unless its estimate fits the
remaining hours for that day. The 1 hour on Day 7 is the only reserve.

References:

- `docs/implementation/7_DAY_MVP_PLAN.md`
- `docs/implementation/7_DAY_IMPLEMENTATION_TICKETS.md`
- `docs/implementation/EXTERNAL_INTEGRATION_BLOCKERS.md`

---

# Stage 0 — Baseline and scope lock

Before any ticket:

1. Inspect `package.json`, `tsconfig.json`, `jest.config.js`, `config/.env.example`,
   and the module layout.
2. Inspect Git state: branch, recent commits, uncommitted changes.
3. Run `npm run typecheck`, `npm run lint`, `npm test`; record real results.
4. Confirm the completed-work list below before creating tasks.
5. Freeze the order / payment / response-envelope contract for the window.

**Git state at plan time (preserve it):**

- Branch `main`.
- `7980051` — Zod migration and Jest unit tests.
- `6016074` — frontend/backend folder split and env wiring.
- Uncommitted: `BACKEND_CODE_AUDIT_CCTV.md` and `OPENCODE_CHANGE_REPORT.md` show
  as deleted; `cctv_backend_engineering_workflow.md` is untracked.
- Rule: no `reset`, `clean`, `checkout`, or commit that discards these changes
  without explicit instruction.

---

# Stage 1 — Focused audit (not a repository tour)

## 1.1 Completed work — out of scope, do not repeat

The following is implemented and must not be rebuilt, re-migrated, or "improved"
inside the 7-day window.

| Area | State | Evidence |
| --- | --- | --- |
| Joi → Zod validation | Done | `src/common/validation/*`, every module's `*.validate.ts`, `src/common/utils/validate.ts` |
| Jest test harness | Done | `jest.config.js`, `jest.setup.ts`, 7 test files |
| Cypress API suite | Done | `cypress/e2e/*.cy.ts` |
| Auth: JWT, RBAC, refresh, email verification, reset, Google OAuth | Done | `src/module/auth/*`, `src/common/middleware/auth.ts` |
| Users, profile, avatar | Done | `src/module/user/*` |
| Categories and subcategories | Done | `src/module/category/*`, `src/module/subcategory/*` |
| Products: CRUD, images, variants, filter/sort/pagination | Done | `src/module/product/*`, `src/database/model/product.model.ts` |
| Cart and wishlist | Done | `src/module/cart/*`, `src/module/wishlist/*` |
| Orders, stock transaction, idempotency key, independent statuses | Done | `src/module/order/*`, `src/database/model/order.model.ts` |
| Installation request workflow | Done | `src/module/installation/*` |
| Stripe card checkout (legacy provider) | Present, optional | `src/module/order/stripe.service.ts` |
| Security: Helmet, CORS allow-list, rate limiting, sanitization, error handler | Done | `src/app.controller.ts`, `src/common/*` |

If a task touches any of the above, it must be a **named gap** with an acceptance
criterion, not a general cleanup.

## 1.2 Audit checklist for the remaining work

Inspect only what the 7-day scope needs:

| Area | What to check | Why it matters |
| --- | --- | --- |
| Product model | No `brand`, no `specifications` | CCTV buyers need specs |
| Bundles | No model, no pricing, no availability | Client sells 4-cam and 8-cam kits |
| Cart | Product lines only; never cleared | Bundle checkout and double orders |
| Order creation | Requires items in body; no `orderNumber`; no history | Support and tracking |
| Stock | Transactional deduction; read-modify-write restore; no expiry | Overselling and stuck inventory |
| Payments | Stripe only; 3 statuses; no dedupe; no inquiry | Paymob is the requirement |
| Admin orders | Page/limit only; manual `paid` unaudited | Fraud and operations |
| Tracking | Order detail only; no timeline | Customer support |
| Env | No Paymob or payment TTL variables | Misconfiguration |
| Tests | No payment, bundle, or stock-release coverage | Highest-cost failure areas |

## 1.3 Audit output format

| Field | Required content |
| --- | --- |
| File path | Exact path |
| Current implementation | What the code actually does |
| Verified status | VERIFIED / INSPECTED / NOT TESTED |
| Problem | Concrete defect or gap |
| Business impact | What breaks at launch |
| Recommended action | Ticket ID or "out of scope" |

The audit is a working input to Stage 2, not a deliverable of its own. Do not
produce a file for a one-week project when the plan and tickets already carry the
findings.

---

# Stage 2 — Way finder and specification

## 2.1 Workstreams for this window

**A. Catalog: technical specifications.** Add `brand` and a bounded
`specifications` structure (key, value, optional unit, Arabic variants). Server
serializes with a safe fallback; legacy rows never throw.

**B. Bundles.** Fixed 4-camera and 8-camera kits. HDD options 1TB/2TB.
Installation options: none, or Riyadh. Server computes
`base + hddDelta + installationDelta` after applying the discount. The client
never supplies a price.

**C. Checkout and order integrity.** Cart → order in one server-side call.
Human-readable `orderNumber`. `statusHistory`. Guarded transitions. Cart cleared
only after a successful commit.

**D. Payment (Paymob KSA).** Provider-agnostic module with a `PaymentProvider`
interface, a mock adapter, and Paymob implementation. Session creation, HMAC
webhook verification, ledger, dedupe, inquiry, failure/expiry, capability gating.

**E. Operations and tracking.** Admin status filters, audited manual payment
update, customer tracking endpoint with timeline.

**F. Tests.** Only the four places where a bug costs money: bundle pricing, money
conversion, HMAC verification, replay/stock release.

## 2.2 Specification template

For each workstream, define:

1. Objective.
2. Current implementation.
3. Expected behaviour.
4. Business rules.
5. Input/output contract.
6. Validation rules.
7. Error scenarios.
8. Security requirements.
9. Test requirements.
10. Acceptance criteria.
11. Dependencies and blockers.

## 2.3 Payment specification (mandatory detail)

**Session creation**

- Amount in integer minor units (halalas); currency `SAR`.
- `special_reference` = our `orderNumber`.
- Item lines match the stored order snapshot.
- Billing/customer data derived from the shipping address.
- `notification_url` = public HTTPS webhook.
- `redirection_url` = frontend result page.
- Only activated integration IDs are sent.

**Webhook verification**

- Raw body, mounted before `express.json`.
- HMAC-SHA512 over the confirmed field list, constant-time comparison.
- Invalid or missing signature → `401`, no state change.
- Parse only after verification.

**Status synchronization**

- `pending → paid` only on verified callback or authoritative inquiry.
- `paid` is terminal.
- Amount and currency re-checked against the stored order.
- Mismatch logs a reconciliation event and never marks paid.

**Idempotency**

- `PaymentTransaction` unique on `(provider, providerTransactionId)`.
- Duplicate callback → `200`, no side effect.
- `stockReleasedAt` guards stock release, inside a transaction.

**Failed, expired, cancelled**

- Order becomes `failed` / `expired` / `cancelled` as appropriate.
- Stock released exactly once.
- Late failure callback never downgrades `paid`.

**Refund and cancellation**

- Cancellation: supported in the MVP through admin action and stock release.
- Refund automation: post-launch; manual through the provider dashboard with the
  provider reference recorded in the order audit trail.
- Refund rules must be confirmed with the provider before the runbook is written.

**Credentials**

Documented in `EXTERNAL_INTEGRATION_BLOCKERS.md`. No real value in the repository.
`.env.example` carries placeholders only.

---

# Stage 3 — Tickets

Convert approved specifications into small, independent tickets. Each ticket
must contain:

- Ticket ID and title.
- Priority (`P0` / `P1` / `P2` / `P3`).
- Estimated effort in hours.
- Dependencies.
- Delivery day.
- Related module and problem statement.
- Scope and expected files.
- Technical implementation steps.
- Acceptance criteria.
- Test requirements.
- Documentation updates.
- Applicable guards.

Ticket execution order is dependency-ordered, not importance-ordered. A P0 ticket
does not jump ahead of its prerequisite.

---

# Mandatory engineering guards

**Clean Code Guard.** Separation of concerns; consistent naming; no duplicated
business logic; no speculative abstraction; type-safe code; follow the existing
vertical-slice architecture (`controller` → `service` → `model`).

**Test Guard.** Unit tests for business logic; integration tests for critical
workflows; regression tests for existing behaviour; zero false claims of passing
tests. If a test was not run, say so.

**Docs Guard.** API documentation, `.env.example`, business rules, and
implementation stay consistent. Documentation must distinguish verified behaviour
from planned behaviour.

**Payment Guard.** The ten invariants in §"Payment security invariants" are not
negotiable and are never weakened to meet a date.

---

# Payment security invariants

1. Never mark an order paid from a redirect, query parameter, or return URL.
2. Verify signature before reading business data.
3. Re-verify amount and currency before `paid`.
4. `paid` is terminal.
5. Deduplicate provider events by transaction ID.
6. All secrets server-side; never in responses, URLs, or logs.
7. Store provider references only; never card data.
8. Hosted checkout keeps PCI scope at SAQ A.
9. Failed/expired payments release stock at most once.
10. A mock adapter never counts as a verified integration.

---

# Ticket execution rules

- Do not execute tickets during a planning phase.
- Keep tickets small, independent, and modular.
- Avoid breaking database changes without an approved migration plan.
- Preserve existing uncommitted changes and working features.
- One ticket per change set; do not bundle refactors with behaviour changes.
- If a ticket exceeds its estimate by more than 50%, stop and report rather than
  absorbing the overrun.

---

# Definition of done

A ticket is done when:

1. `npm run typecheck` passes.
2. `npm run lint` has no new errors.
3. `npm test` passes and includes the ticket's tests.
4. Acceptance criteria are demonstrated, not asserted.
5. Docs are updated in the same change set.
6. No secret or card data is introduced.
7. Existing endpoints keep their behaviour unless explicitly changed.
8. Limitations are written down.

---

# Deliverables

## Current deliverables

| File | Purpose |
| --- | --- |
| `docs/implementation/7_DAY_MVP_PLAN.md` | Constraint, capacity, scope, schedule, gates, risks |
| `docs/implementation/7_DAY_IMPLEMENTATION_TICKETS.md` | 26 executable tickets + post-launch backlog |
| `docs/implementation/EXTERNAL_INTEGRATION_BLOCKERS.md` | Paymob, infrastructure, and business blockers |

## Superseded deliverables

These were part of the original open-ended workflow and are replaced by the three
documents above:

| Original deliverable | Status |
| --- | --- |
| `docs/audit/BACKEND_AUDIT.md` | Superseded — findings are in the plan and tickets |
| `docs/specs/BACKEND_TECHNICAL_SPECIFICATIONS.md` | Superseded — specifications live in Stage 2 and the tickets |
| `docs/implementation/BACKEND_IMPLEMENTATION_TICKETS.md` | Superseded by `7_DAY_IMPLEMENTATION_TICKETS.md` |

Historical context remains in `BACKEND_AUDIT_AND_CLEANUP.md` and
`BACKEND_IMPLEMENTATION_REPORT.md`; neither is modified by this workflow.

---

# Final output structure

1. Audit summary.
2. Verified completed work.
3. Remaining work.
4. Technical specifications.
5. Ordered implementation tickets.
6. Dependencies and blockers.
7. Risks requiring business decisions.
8. Recommended first ticket and rationale.

**Recommended first ticket:** `MVP-01` — freeze the order/payment contract and
verify the baseline. Everything else depends on the contract and on knowing the
repository actually compiles and tests before changes begin.

---

# Approval gate

- Planning is complete when this workflow and the three deliverables are approved.
- Implementation begins only after explicit per-ticket approval.
- The client must be told, in writing, if Paymob cannot be verified with real
  merchant credentials inside the window. COD is an additional method, never a
  silent replacement.
