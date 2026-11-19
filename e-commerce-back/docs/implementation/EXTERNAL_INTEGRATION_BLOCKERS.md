# External Integration Blockers — CCTV E-Commerce

Companion to `7_DAY_MVP_PLAN.md` and `7_DAY_IMPLEMENTATION_TICKETS.md`.

This document exists because the 7-day window is shorter than most third-party
onboarding cycles. Every item below is outside the developer's control. An
unresolved item does not stop the code from being written, but it does stop a
claim of "verified".

## Status labels

| Label | Meaning |
| --- | --- |
| **VERIFIED** | Proven with the real provider, with evidence recorded below |
| **CONFIGURED** | Credentials present and a request succeeded, but not a full business flow |
| **IMPLEMENTED** | Code exists and follows documented defaults; the provider has not been exercised |
| **NOT TESTED** | Code exists, provider not exercised |
| **BLOCKED** | Cannot proceed without an external action |
| **UNCONFIRMED** | Public information only; must be confirmed in writing by the provider |

---

## 1. Blocker summary

| ID | Item | Type | Owner | Needed by | Impact if missing | Status |
| --- | --- | --- | --- | --- | --- | --- |
| B-01 | Paymob merchant account approved for e-commerce (Egypt or KSA) | Commercial | Client | Day 1 | No card/mada/Apple Pay at all | BLOCKED |
| B-02 | Confirmed regional API base URLs and API version | Technical | Paymob AM | Day 1 | Integration built against wrong host | IMPLEMENTED, NOT VERIFIED |
| B-03 | API key, secret key, public key, HMAC secret | Credential | Paymob / Client | Day 4 | Session and webhook cannot be verified | PARTIAL — NOT VERIFIED: Egyptian API/secret/public keys located; HMAC secret unverified |
| B-04 | Per-method integration IDs: card, mada, Apple Pay, Tabby, Tamara | Credential | Paymob AM | Day 4 | Method silently fails or is hidden | PARTIAL — NOT VERIFIED: Egyptian integration ID `6067` located; method mapping and remaining methods unverified |
| B-05 | Exact HMAC field list and ordering for this account | Technical | Paymob AM | Day 5 | Every callback rejected, or worse, unverified | IMPLEMENTED, NOT VERIFIED |
| B-06 | Public HTTPS webhook URL (staging or tunnel) | Infrastructure | Client / Dev | Day 5 | No real callback can be received | BLOCKED |
| B-07 | Sandbox test cards / mada simulation procedure | Technical | Paymob AM | Day 4 | Cannot complete a test payment | BLOCKED |
| B-08 | Apple Pay merchant ID + domain verification file hosted | Commercial + Ops | Client / Apple | Post-launch if not ready | Apple Pay hidden | BLOCKED |
| B-09 | Tabby merchant agreement and activation | Commercial | Client / Tabby | Post-launch | Tabby hidden | BLOCKED |
| B-10 | Tamara merchant agreement and activation | Commercial | Client / Tamara | Post-launch | Tamara hidden | BLOCKED |
| B-11 | Refund, void, and settlement rules | Commercial | Paymob AM | Day 7 | Manual ops may be wrong | UNCONFIRMED |
| B-12 | Shipping carrier contract and API credentials | Commercial | Client | Post-launch | Manual tracking only | BLOCKED |
| B-13 | ZATCA e-invoicing requirement for B2C receipts | Legal | Client / accountant | Day 7 | Compliance exposure | UNCONFIRMED |
| B-14 | SMTP credentials and sender domain | Infrastructure | Client | Day 7 | No verification / reset emails | BLOCKED |
| B-15 | Cloudinary account or persistent upload volume | Infrastructure | Client | Day 7 | Images lost on redeploy | BLOCKED |
| B-16 | Production domain, DNS, and TLS | Infrastructure | Client | Day 7 | No staging URL, no webhook | BLOCKED |

---

## 2. Paymob (Egypt / KSA)

### 2.1 What is implemented, and what still needs written confirmation

The integration is deliberately region-explicit. `PAYMOB_REGION` selects one
host set; there is no fallback and no cross-region credential use. The code
follows Paymob's documented contract, but no request has been sent to a real
merchant account, so the table below is **IMPLEMENTED, NOT VERIFIED**.

| Question | Implemented default | Verification state |
| --- | --- | --- |
| Which host serves merchant API calls? | Egypt `https://accept.paymob.com`; KSA `https://ksa.paymob.com` | Not provider-verified |
| Which host serves checkout? | Same regional host + `/unifiedcheckout/` | Not provider-verified |
| Which API? | Intention API `POST /v1/intention/` with `Authorization: Token <secret>` | Not provider-verified |
| Inquiry API? | Legacy API-key → auth token → `GET /api/ecommerce/orders/{id}?token=` | Not provider-verified |
| Amount format? | Integer minor units (halalas/piastres), derived from the stored order | Unit-tested only |
| Currency? | Configured store currency (`SAR` in `.env.example`) | Not provider-verified |
| Callback shape? | Transaction and order callbacks parsed defensively | Not provider-verified |
| HMAC? | SHA-512 over a fixed 20-field order, `hmac` query parameter, constant-time compare | Unit-tested with a known vector; not provider-verified |
| Session expiry? | `PAYMENT_ORDER_TTL_MINUTES` (default 30) | Local policy, not provider-matched |

Implemented endpoint constants (override only with a region-matching URL):

| Setting | Egypt | KSA |
| --- | --- | --- |
| API base | `https://accept.paymob.com` | `https://ksa.paymob.com` |
| Unified Checkout | `https://accept.paymob.com/unifiedcheckout/` | `https://ksa.paymob.com/unifiedcheckout/` |

The account manager must still confirm that the merchant's account is attached
to the selected region and that the endpoint/version is current for that account.

### 2.2 Credentials checklist (B-03, B-04)

Send to the Paymob account manager for the selected region (`eg` or `ksa`) and
request answers in writing:

1. Merchant account ID and whether it is **live** or **test**.
2. API key.
3. Secret key (intention/session API).
4. Public key (checkout).
5. HMAC secret.
6. Integration ID for **card** (Visa / Mastercard).
7. Integration ID for **mada** — confirm it is activated, not merely available.
8. Integration ID for **Apple Pay** — plus merchant identifier and domain
   association status.
9. Integration ID for **Tabby** — plus merchant agreement reference.
10. Integration ID for **Tamara** — plus merchant agreement reference.
11. Sandbox equivalents of items 2–10.
12. Named support contact and escalation path for launch week.

Do not put real values in this document or in `.env.example`. They go only in
`config/.env` on the server and in the deployment secret store.

### 2.3 Payment method activation matrix

Activation is **per merchant**, not per country. The storefront must show only
what is enabled.

| Method | Requested | Activated | Integration ID present | Storefront behaviour |
| --- | --- | --- | --- | --- |
| Visa / Mastercard | Yes | TBC | TBC | Shown if activated |
| mada | Yes | TBC | TBC | Shown if activated |
| Apple Pay | Yes | TBC | TBC | Shown only after domain verification |
| Tabby | Investigated | TBC | TBC | Hidden until agreement + activation |
| Tamara | Investigated | TBC | TBC | Hidden until agreement + activation |
| COD | Yes | N/A | N/A | Always shown as an additional method |

**Rule:** if activation is unknown, the method is hidden. Never show a method that
will fail at the provider. The code enforces this with
`PAYMOB_METHODS_ENABLED` plus a non-empty integration ID; by default only `card`
is exposed. Apple Pay, Tabby, and Tamara remain disabled until activation is
confirmed in writing.

### 2.4 Onboarding requirements to confirm with Paymob

The following are the usual KSA e-commerce onboarding inputs. Confirm the exact
list; do not submit documents twice.

- Commercial registration (CR).
- VAT registration certificate.
- National address.
- KSA bank account / IBAN for settlement.
- Authorised signatory and company stamp where required.
- Website URL with terms, privacy, shipping, and return policy pages.
- Business category matching the sold goods.
- Expected monthly volume and average order value.
- Technical contact for integration.

### 2.5 Refund, void, and settlement (B-11)

Needed for the operations runbook, even though automation is post-launch:

- Is a same-day **void** available, and for how long?
- Is a **partial refund** supported? Minimum amount?
- Refund destination: card only, or wallet where applicable?
- Settlement cycle (T+?) and how to reconcile a payout against orders.
- Who approves refunds on the merchant side, and what evidence is required?
- Behaviour for a refunded order that already shipped.

Until answered, the runbook instructs staff to refund through the Paymob dashboard
and record the provider reference in the order audit history.

### 2.6 Apple Pay domain verification (B-08)

Not a backend-only task:

1. Apple Developer account and merchant identifier.
2. Domain association file hosted at the storefront domain.
3. Paymob Apple Pay activation referencing that domain.
4. A real device test with a sandbox Apple ID.

If any step is missing by Day 7, Apple Pay is hidden by the capability gate and
listed as post-launch. The rest of the payment flow is unaffected.

### 2.7 Tabby and Tamara (B-09, B-10)

Investigated, not assumed. Both typically require:

- A separate merchant agreement and KYC, independent of the card acquirer.
- Minimum and maximum order values.
- Product category eligibility (electronics is usually eligible; confirm).
- Customer data and line-item requirements, including SKU and description.
- Settlement and refund rules different from card.
- Separate sandbox credentials.

Both are behind the capability gate. They are **post-launch** unless activation is
confirmed and a credential-verified test is completed. Integration estimate if
activated: ~8h each, which does not fit the 47h plan.

---

## 3. Payment security contract (what we build regardless of answers)

These invariants do not depend on unconfirmed provider details:

1. Session creation is server-side only; the API key never reaches the browser.
2. Amount is sent in integer minor units (halalas) and re-checked against the
   stored order before any status change.
3. The return/redirect URL is **not** a payment confirmation. It triggers an
   authoritative status inquiry at most.
4. A callback is accepted only after signature verification over the raw body,
   using a constant-time comparison.
5. Callbacks are deduplicated by provider transaction ID with a unique index.
6. `paid` is terminal and is never downgraded by a later callback.
7. Amount or currency mismatch never results in `paid`; it is logged for
   reconciliation instead.
8. Failed, expired, and cancelled payments release stock at most once, guarded by
   `stockReleasedAt`.
9. No card data is stored; hosted checkout keeps the integration in SAQ A scope.
10. Secrets and raw payloads are never logged.

---

## 4. Infrastructure blockers

### B-06 — Public HTTPS webhook (critical path, Day 5)

Paymob cannot call `http://localhost`. Options, in order of preference:

1. Staging host with a real domain and TLS, exposed on the public internet.
2. A temporary tunnel for Day 5–7 testing, with the final URL updated before
   handoff.
3. No public URL: webhook verification is unit-tested only and the integration is
   marked **NOT TESTED**.

The webhook URL must be stable enough that a provider retry after the test window
still resolves.

### B-14 — SMTP and sender domain

Needed for signup verification, password reset, and contact notifications. Without
it those routes degrade (the code already fails safely). Configure:

- SMTP host, port, secure flag.
- Sender address and display name.
- SPF/DKIM alignment on the sending domain.

### B-15 — Media storage

Local `uploads/` works for a demo but is lost on redeploy. Cloudinary credentials
are preferred. If neither is ready, the delivery note must state that product
images are ephemeral on the staging host.

### B-16 — Domain, DNS, TLS

Needed for the storefront, the webhook, and any Apple Pay domain association.
Purchase and DNS control are client responsibilities.

---

## 5. Business decisions (not technical blockers, but they change behaviour)

| ID | Decision | Default if unanswered | Needed by | Impact |
| --- | --- | --- | --- | --- |
| DEC-01 | Does a bundle sale deplete component and HDD stock? | **Resolved:** yes for camera components; bundle has no own counter | Day 3 | Delivered in MVP-09; component reservation/release implemented |
| DEC-02 | Refund policy: who approves, partial allowed, restocking fee? | Manual via Paymob dashboard, full refund only | Day 7 | Ops runbook accuracy |
| DEC-03 | COD scope: all KSA, Riyadh only, order value cap, fee? | All KSA, no fee | Day 7 | Checkout availability and totals |
| DEC-04 | Installation coverage outside Riyadh? | Riyadh only, shown as an option | Day 2 | Bundle option catalogue |
| DEC-05 | Shipping cost model and delivery estimate | Flat configured fee, estimate not shown | Day 7 | Cart and order totals display |
| DEC-06 | Are displayed prices VAT-inclusive (15%)? | Yes, VAT-inclusive | Day 7 | Payment amount and receipt wording |
| DEC-07 | Order cancellation window for customers | No self-service cancel; support only | Day 7 | API surface |

**DEC-01 is resolved** to component-level inventory and delivered in MVP-09. No
remaining business decision changes the engineering estimate.

---

## 6. Timeline impact and escalation

| Moment | Condition | Action |
| --- | --- | --- |
| Day 1, end | B-01/B-03 requested but no answer | Continue building against mock; escalate to client |
| Day 4, 12:00 | B-03/B-04 still missing | Gate G3 fails. Continue on mock. Notify client in writing: card/mada cannot be verified in this window |
| Day 5, end | B-05/B-06 missing | Webhook HMAC can still be unit-tested with a known vector, but no real callback is verified |
| Day 7, end | B-03/B-06 still missing | Launch with Paymob implemented but **NOT TESTED**, COD available, and the blockers table delivered as part of the handoff |
| Any time | B-01 approved late | Schedule a separate verification session; do not backdate a "ready" claim |

**Not permitted:** replacing the Paymob requirement with COD without telling the
client, or describing the integration as working while it has only run against a
mock.

---

## 7. What the mock adapter does and does not prove

| Proves | Does not prove |
| --- | --- |
| Request payload shape is correct | The provider accepts the payload |
| Amount conversion to halalas | Settlement amount matches |
| Webhook handler is idempotent | The provider's HMAC field list matches ours |
| Failure and expiry transitions work | The provider's failure codes map correctly |
| Checkout redirect flow is wired | Mada, Apple Pay, Tabby, or Tamara render |
| Stock release is safe | Real transaction inquiry returns the expected shape |

The mock is a contract test, not an integration test. Documentation must say so.

---

## 8. Verification log

Fill in during implementation. No row may be marked VERIFIED without evidence.

| Date | Item | Method | Result | Evidence | Owner |
| --- | --- | --- | --- | --- | --- |
| 2026-11-16 | Baseline `typecheck` / `lint` / `test` | Local command | **VERIFIED**: typecheck pass; lint 0 errors (25 pre-existing warnings); Jest 7 suites / 54 tests pass | `npm run typecheck`, `npm run lint`, `npm test` | Dev |
| 2026-11-16 | Paymob credential request sent (MVP-03) | Email / portal | **BLOCKED**: no Paymob KSA account-manager contact or merchant credentials were supplied; request not sent | Checklist B-01–B-12 is prepared in §2.2; no recipient available | Client / Dev |
| 2026-11-16 | Mock payment adapter contract (MVP-02) | Jest | **VERIFIED** (contract only, not a provider) | 8 Jest tests across registry/mock suites | Dev |
| 2026-11-17 | Bundle cart/order pricing, cart checkout, order lifecycle (MVP-09/10/11) | Jest unit suites | **VERIFIED** (unit only; no DB integration harness) | `cart.validate`, `order.validate`, `order.lifecycle`, `order.number`, pricing/money suites | Dev |
| 2026-11-17 | Paymob config guard + minor-unit money (MVP-12) | Jest unit suites | **VERIFIED** (config/conversion only; no network) | `paymob.config`, `payment.registry`, `money` suites | Dev |
| 2026-11-17 | Paymob session/intention creation (MVP-13) | Jest with stubbed HTTP client | **VERIFIED** at the unit/contract level: Intention API request shape, token header, amount in minor units, checkout URL, error mapping. **NOT TESTED** against Paymob | `src/module/payment/paymob.provider.test.ts` | Dev |
| 2026-11-17 | Payment status endpoint (MVP-14) | Jest/validation + code review | **VERIFIED** for stored status, ownership (`404` for another user), and `nextAction`. Inquiry path is mocked, not provider-verified | `src/module/payment/payment.service.ts`; `payment.validate` suite | Dev |
| 2026-11-17 | Paymob sandbox smoke run (MVP-15) | Sandbox request | **NOT TESTED / BLOCKED**: no merchant credentials, integration IDs, or public webhook URL | B-01–B-07 | Client / Dev |
| 2026-11-19 | Post-implementation regression baseline | Local command | **VERIFIED**: `tsc --noEmit` exit 0; Jest 23 suites / 158 tests pass; lint 0 errors | `npm run typecheck`, `npm test`, `npm run lint` | Dev |
| 2026-11-19 | Intention API provider (MVP-13/MVP-18/MVP-20) | Jest with stubbed `fetch` | **VERIFIED** (unit only): auth header, regional base URL, intention payload, redirect URL construction, inquiry parsing, method gating. No real request was sent | `paymob.provider.test.ts`, `payment.registry.test.ts` | Dev |
| 2026-11-19 | Webhook HMAC (MVP-16) | Jest, fixed secret + known vector | **VERIFIED** (unit only): 20-field SHA-512 order, valid signature, tampered body/signature rejection, missing `hmac` rejection, raw `Buffer` assertion | `paymob.hmac.test.ts`, `paymob.webhook.test.ts` | Dev |
| 2026-11-19 | Ledger, replay dedupe, settlement (MVP-17) | Jest with mocked models | **VERIFIED** (unit only): unique provider transaction key, paid-terminal rule, amount/currency mismatch, late-payment reconciliation decision. **No MongoDB transaction was exercised** | `payment.settlement.test.ts`, `payment.events.test.ts` | Dev |
| 2026-11-19 | Expiry, stock release, reconcile (MVP-19) | Jest unit suites | **VERIFIED** (unit only): lazy expiry, idempotent sweep, one-time release, reconcile requires `reacquireStock`. **No DB-backed replay/stock test** | `order.expiry.test.ts`, `order.stock.test.ts` | Dev |
| 2026-11-19 | Admin filters, tracking, method gating (MVP-20–22) | Jest unit/validation + code review | **VERIFIED** (unit only): filters, restricted sort, validated enums, tracking ownership, chronological timeline, method allow-list | `order.lifecycle.test.ts`, `payment.registry.test.ts` | Dev |
| 2026-11-19 | Day 5/6 full local gate | Local command | **VERIFIED**: `tsc --noEmit` exit 0; Jest 31 suites / 233 tests pass in 31.45s; ESLint 0 errors, 24 warnings | See `../DAY5_DAY6_DELIVERY_REPORT.md` | Dev |
| 2026-11-19 | Intention/session creation | Sandbox request | **NOT TESTED**: no credentials or public callback URL | — | Dev |
| 2026-11-19 | Webhook HMAC | Real callback | **NOT TESTED**: known-vector unit tests only | — | Dev |
| 2026-11-19 | Replay protection | Duplicate real callback | **NOT TESTED**: no database integration harness | — | Dev |
| 2026-11-19 | Mada / Apple Pay / Tabby / Tamara | Sandbox checkout | **BLOCKED / NOT TESTED**: activation and credentials missing; methods disabled by default | — | Client / Dev |
| 2026-11-19 | Public webhook reachability | External request | **BLOCKED**: no public HTTPS endpoint | — | Client / Dev |
| 2026-11-19 | KSA regional behavior | Sandbox request | **NOT TESTED**: no KSA merchant account or credentials | — | Client / Dev |

---

## 9. Sign-off

- Blockers listed: 16 external inputs, 7 business decisions.
- Critical path for online payments: **B-03, B-04, B-05, B-06** — Paymob
  credentials, integration IDs, confirmed HMAC contract, and a public callback URL.
- Code status on 2026-11-19: Day 5/6 implemented; verification is unit/mocked only.
  No real Paymob request, callback, or sandbox payment has been executed.
- KSA regional behavior is **NOT TESTED**. Egypt credentials do not authorize a
  KSA claim, and vice versa.
- Owner of external follow-up: client, with the developer sending the requests.
- This document must be updated, not replaced, as answers arrive.
