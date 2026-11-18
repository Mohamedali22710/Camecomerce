# Bundle Component Inventory — Implementation Design

| Field | Value |
| --- | --- |
| Status | **Design only.** Not implemented in Phase 0. |
| Decision | DEC-01 resolved by the business on 2026-11-18 |
| Scope | Checkout, cancellation, stock release, catalogue availability |
| Applies to | `bundle`, `cart`, `order`, `payment` modules |

> This document is a plan. No schema, index, migration, endpoint, or stock
> behaviour described here exists in the code yet.

---

## 1. Decision being implemented

1. An admin selects the **products and quantities** that make up a bundle.
2. The admin sets the **final bundle selling price manually**.
3. The customer buys the bundle exactly as displayed.
4. Selling a bundle **deducts component quantities from normal product
   inventory**.
5. **Insufficient component stock blocks checkout.**
6. **There is no independent bundle stock counter.**

The last point is the important one: a bundle is never a stock-keeping unit. Its
availability is a *derived* value computed from its components.

---

## 2. Current state (inspected)

| Concern | Current behaviour | Gap |
| --- | --- | --- |
| Bundle composition | `bundle.model.ts` → `cameras: { productId, color, size, quantity }[]` | Already sufficient as the component list |
| Bundle price | `basePrice` + optional `discount` + `hddOptions[].priceDelta` + `installationOptions[].priceDelta` (`bundle.pricing.ts`) | Manual price exists; no change needed |
| Cart availability | `cart.lines.ts` sets `available: true`, `stock: null`, `availabilityUnknown: true` for bundles | No component check |
| Checkout | `order.service.ts` `resolveOrderLines` skips bundle stock entirely (`stockReleasedAt`/DEC-01 comment) | No deduction, no shortage check |
| Order snapshot | `BundleOrderSnapshot` stores `bundleId`, `bundleCode`, names, `quantity`, `unitPrice` | **No component snapshot** → restock would depend on the live bundle document |
| Stock release | `restoreProductStock` skips `itemType: "bundle"` | No bundle restoration |
| Concurrency | Product stock lives in a JSON string on the product document, mutated inside a transaction | Write conflicts under contention; no per-variant atomic guard |

The existing `bundle.cameras` array is the source of truth for composition. The
model must **not** gain a `stock` field.

---

## 3. Data model

### 3.1 Bundle (unchanged shape, tightened validation)

```
Bundle {
  code, en_name, ar_name, description,
  basePrice,            // manual selling price (major units, SAR)
  discount,             // optional percentage applied to basePrice
  hddOptions[], installationOptions[],
  cameras: [            // components
    { productId, color, size, quantity }   // quantity >= 1
  ],
  isActive, isDeleted, addedByEmail
}
```

Validation to add when implemented:

* `cameras` must contain at least one row.
* `(productId, color, size)` must be unique **within one bundle** (merge
  duplicates on write instead of storing them twice).
* `quantity >= 1` and an upper bound (for example 100) to keep expansion bounded.
* The referenced product/variant must exist; a warning (not a hard failure) when
  the product is inactive, as today.

### 3.2 Order bundle line (additive snapshot)

```
BundleOrderSnapshot {
  itemType: "bundle",
  bundleId, bundleCode, en_name, ar_name, fr_name,
  quantity, unitPrice, lineTotal,
  hddOption, installationOption,          // keep the chosen option codes
  components: [                           // NEW — frozen at order time
    { productId, color, size, quantity }  // quantity = component qty × line qty
  ]
}
```

Why snapshot the components:

* A bundle can be edited or deleted after an order is placed.
* Restock must return **exactly** what was deducted, not what the bundle happens
  to contain at cancellation time.
* Support needs an auditable record of what the customer's bundle consumed.

`components` is derived data inside the existing `items` JSON string, so no
schema migration is required for the order collection.

---

## 4. Checkout algorithm

### 4.1 Expansion and aggregation

For every order line:

* Product line → requirement `{productId, color, size, quantity}`.
* Bundle line of quantity `q` → for each component `c`:
  requirement `{c.productId, c.color, c.size, quantity: c.quantity * q}`.

Then **aggregate by `productId|color|size` across the whole order**. This is what
prevents overselling when the same variant appears in several places:

```
Bundle A (×1): camera-1 white/2TB ×4, nvr-1 default ×1
Bundle B (×1): camera-1 white/2TB ×2, hdd-1 default ×2
Product line: camera-1 white/2TB ×1

Aggregated: camera-1 white/2TB ×7, nvr-1 ×1, hdd-1 ×2
```

Without aggregation, three independent checks against `stock = 7` would all pass
and the order would consume 7 units while each check believed it was safe — or,
worse, decrement in three separate writes and let one of them go negative.

### 4.2 Validate first, then deduct

Inside the **existing order transaction**:

1. Resolve and price all lines (unchanged, server-side only).
2. Expand bundles and aggregate requirements (4.1).
3. Load every required product once (`findById().session(session)`).
4. `assertComponentsAvailable(aggregated)`:
   * missing product → `404` naming the product;
   * missing variant → `400` naming product/colour/size;
   * `variant.stock < required` → `400` with
     `Available: N, required: M` for the **aggregated** quantity.
   * Inactive product → `400`/`404` consistent with the product-line rule today.
5. Deduct **all** requirements in the same transaction.
6. Create the order, with each bundle line carrying its `components` snapshot.
7. Commit.

Failing before any write means a rejected order cannot leave a half-decremented
catalogue.

### 4.3 Availability shown to the storefront

```
bundleUnitsAvailable(bundle) =
  min over components c of floor(stock(c.productId, c.color, c.size) / c.quantity)
```

* `cart.lines.ts` stops setting `availabilityUnknown: true` and returns the
  computed number (plus per-component shortages for the cart UI if desired).
* Adding more than `bundleUnitsAvailable` to the cart may be allowed (carts are
  not reservations), but **checkout must reject it** with the same message the
  product path uses.
* No `stock` column is ever added to the bundle document or to the bundle API.

### 4.4 Mixed orders

Product lines and bundle lines are expanded into one requirement map. A mixed
order therefore behaves exactly like a single-product order with respect to
stock: one validation pass, one deduction pass, one failure mode. There is no
"bundle checkout path" separate from the product path.

---

## 5. Concurrency and no-oversell

The current transaction already prevents oversell on a replica set: two
transactions writing the same product document produce a `WriteConflict` and one
aborts. The design keeps that property but removes the two weaknesses found in
the audit:

1. **Coarse locking.** Today any two orders that touch the *same product* (even
   different variants) conflict because the whole `variants` JSON string is
   rewritten. Bundles increase that pressure because one bundle touches several
   products.
2. **No retry.** A `TransientTransactionError` surfaces as a `500`.

Recommended implementation:

* Keep the transaction as the correctness boundary (no oversell without
  aggregation **and** atomic conditional writes).
* Deduct with an atomic conditional update per `(productId, variant)`:

  ```js
  // shape depends on the final inventory storage
  { _id: productId,
    variants: { $elemMatch: { color, size, stock: { $gte: required } } } }
  { $inc: { "variants.$.stock": -required } }
  ```

  A `matchedCount === 0` means another order won the race → abort with a clean
  `409`/`400` "stock changed, try again", not a 500.

* If the storage stays as a JSON string (Phase 0 does not change it), the
  transaction plus `WriteConflict` is the guard. Add `session.withTransaction()`
  retry so a transient conflict is retried before it reaches the customer.

**Non-goal:** an "available quantity" counter on the bundle. Any cached number
would be a second source of truth and would drift immediately.

---

## 6. Restoration (exactly once)

Restoration is triggered by the Phase 0 cancellation path, and later by payment
failure/expiry in MVP-19:

```
claim { _id: orderId, stockReleasedAt: null, paymentStatus: { $ne: "paid" } }
restore every product requirement of the order
commit both in one transaction
```

For bundle lines, restore from the **order snapshot**:

* For each `line.components[]`, add `quantity` back to that variant.
* Product lines restore as today.
* Mixed orders restore both in the same transaction.
* Bundle lines must **not** be skipped any more (today `restoreProductStock`
  returns early on `itemType === "bundle"`), otherwise bundle sales permanently
  drain inventory.

Properties:

* One-time: guaranteed by the `stockReleasedAt` claim (already atomic in Phase 0).
* Paid orders are never restocked (Phase 0 guard).
* A missing product/variant throws and aborts the whole claim, so the marker
  stays `null` and the operation can be retried — no silent loss.
* Editing the bundle after the sale cannot change what is restored, because the
  snapshot is frozen.

---

## 7. Rollout plan (when approved)

Additive, no destructive migration:

1. Extend `BundleOrderSnapshot` with `components` and populate it in
   `toBundleSnapshot` / `resolveBundleLine`; new orders only. Old orders without
   `components` fall back to "skip bundle lines" (current behaviour) and are
   logged for manual reconciliation.
2. Add `components` expansion + aggregation + availability validation behind the
   existing transaction. No API contract change: `items[]` still sends
   `bundleId + hddOption + installationOption + quantity`.
3. Compute availability in `cart.lines.ts`; remove `availabilityUnknown` for
   bundles.
4. Enable bundle restoration in `restoreProductStock` using the snapshot.
5. Add the admin-side duplicate/quantity validation for `cameras`.

No index change is required. No data backfill is required for orders that were
never bundle orders. Orders created before step 1 need the documented manual
policy (they currently hold no bundle stock reservation, so there is nothing to
restore).

---

## 8. Test plan (must be database-backed, ephemeral replica set)

Unit tests cannot prove any of this. Required cases:

1. Bundle ×2 with a component quantity of 3 → requires 6; stock 5 → checkout
   rejected, no stock changed.
2. Same variant in two bundles + a product line → one aggregated check.
3. Exactly enough stock → success, stock decremented by the aggregate.
4. Two concurrent checkouts for the last bundle unit → exactly one succeeds; the
   other gets a clean 4xx.
5. Mixed product + bundle order → both restored once on cancellation.
6. Cancelling a paid order → nothing restored.
7. Repeating the cancellation → still restored once (`stockReleasedAt`).
8. Bundle edited (component removed) after sale → cancellation restores the
   original components.
9. Missing product/variant at cancellation → abort, marker stays `null`, retry
   works after repair.
10. Storefront availability equals `min(floor(stock / componentQty))`.
11. No bundle document ever exposes a `stock` field.

---

## 9. Explicit non-goals

* No bundle stock counter, cached availability, or reserved-quantity field.
* No change to the manual bundle price model.
* No reservation of cart contents (carts remain non-binding).
* No Paymob behaviour is assumed anywhere in this design.
* No production migration is executed as part of this document.
