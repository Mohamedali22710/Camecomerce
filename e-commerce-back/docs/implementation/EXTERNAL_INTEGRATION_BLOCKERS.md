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
| **NOT TESTED** | Code exists, provider not exercised |
| **BLOCKED** | Cannot proceed without an external action |
| **UNCONFIRMED** | Public information only; must be confirmed in writing by the provider |

---

## 1. Blocker summary

| ID | Item | Type | Owner | Needed by | Impact if missing | Status |
| --- | --- | --- | --- | --- | --- | --- |
| B-01 | Paymob KSA merchant account approved for e-commerce | Commercial | Client | Day 1 | No card/mada/Apple Pay at all | BLOCKED (assumed not ready) |
| B-02 | Confirmed KSA API base URLs and API version | Technical | Paymob AM | Day 1 | Integration built against wrong host | UNCONFIRMED |
| B-03 | API key, secret key, public key, HMAC secret | Credential | Paymob / Client | Day 4 | Session and webhook cannot be verified | BLOCKED |
| B-04 | Per-method integration IDs: card, mada, Apple Pay, Tabby, Tamara | Credential | Paymob AM | Day 4 | Method silently fails or is hidden | BLOCKED |
| B-05 | Exact HMAC field list and ordering for this account | Technical | Paymob AM | Day 5 | Every callback rejected, or worse, unverified | UNCONFIRMED |
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

## 2. Paymob KSA

### 2.1 What we need to know before writing provider code

The planning environment could not reach `docs.paymob.com` (transport errors), so
**no endpoint, field name, or HMAC ordering in this repository is treated as
confirmed**. The integration is written behind one provider module so that a
wrong assumption is a one-file correction, not a rewrite.

| Question | Why it matters | Answer |
| --- | --- | --- |
| Which host serves KSA merchant API calls? | A wrong host fails every session | **TBC — written answer required** |
| Which host serves KSA checkout? | Redirect URL must be valid | **TBC** |
| Intention API + Unified Checkout, or legacy Accept (auth token → order → payment key → iframe)? | Determines the whole request sequence | **TBC** |
| What is the minimum supported amount and currency format? | 100× money errors | **TBC** |
| Does the account use transaction callbacks, order callbacks, or both? | Determines parser | **TBC** |
| What is the retry policy and timeout for callbacks? | Determines idempotency and reconciliation | **TBC** |
| What is the session expiry window? | Drives `PAYMENT_ORDER_TTL_MINUTES` | **TBC** |

Candidate values seen in public material — **do not deploy these without written
confirmation**:

| Setting | Candidate | State |
| --- | --- | --- |
| KSA API base | `https://ksa.paymob.com/api` | UNCONFIRMED |
| Egypt API base (not for KSA) | `https://accept.paymob.com/api` | UNCONFIRMED, do not use for KSA |
| Unified checkout page | `https://checkout.paymob.com/unifiedcheckout/` | UNCONFIRMED |
| Callback signature | HMAC-SHA512 over a fixed field list, `hmac` query parameter | UNCONFIRMED field order |

### 2.2 Credentials checklist (B-03, B-04)

Send to the Paymob KSA account manager and request answers in writing:

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
will fail at the provider.

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
| DEC-01 | Does a bundle sale deplete component and HDD stock? | **No** — bundle has its own counter; manual reconciliation | Day 3 | +6–8h if yes; does not fit 47h |
| DEC-02 | Refund policy: who approves, partial allowed, restocking fee? | Manual via Paymob dashboard, full refund only | Day 7 | Ops runbook accuracy |
| DEC-03 | COD scope: all KSA, Riyadh only, order value cap, fee? | All KSA, no fee | Day 7 | Checkout availability and totals |
| DEC-04 | Installation coverage outside Riyadh? | Riyadh only, shown as an option | Day 2 | Bundle option catalogue |
| DEC-05 | Shipping cost model and delivery estimate | Flat configured fee, estimate not shown | Day 7 | Cart and order totals display |
| DEC-06 | Are displayed prices VAT-inclusive (15%)? | Yes, VAT-inclusive | Day 7 | Payment amount and receipt wording |
| DEC-07 | Order cancellation window for customers | No self-service cancel; support only | Day 7 | API surface |

**DEC-01 is the only decision that can change the engineering estimate.** The
others change copy, operations, and configuration.

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
| 2026-11-19 | Intention/session creation | Sandbox request | Pending | Provider reference | Dev |
| 2026-11-20 | Webhook HMAC | Real callback or known vector | Pending | Accepted/rejected status | Dev |
| 2026-11-20 | Replay protection | Duplicate callback | Pending | Ledger row count | Dev |
| 2026-11-22 | Mada payment | Sandbox checkout | Pending | Transaction status | Dev |
| 2026-11-22 | Apple Pay | Sandbox device | Pending | Transaction status | Dev |
| 2026-11-22 | Public webhook reachability | External request | Pending | HTTP status | Dev |

---

## 9. Sign-off

- Blockers listed: 16 external, 7 business decisions.
- Critical path: **B-03, B-04, B-05, B-06** — Paymob credentials and a public
  callback URL.
- Owner of external follow-up: client, with the developer sending the requests.
- This document must be updated, not replaced, as answers arrive.
