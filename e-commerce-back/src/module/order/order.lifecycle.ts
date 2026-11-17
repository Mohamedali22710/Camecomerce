/** Order lifecycle rules (MVP-11).
 *
 * Kept pure so the transition table, the manual-paid audit rule, and the
 * one-time stock-release decision can be unit-tested without a database.
 */
import { HttpError } from "../../common/utils/httpError.js";
import { IOrder, OrderStatus, PaymentStatus, ShippingStatus } from "../../database/model/order.model.js";

export type StatusField = "orderStatus" | "paymentStatus" | "shippingStatus";

/** Fulfilment transitions. `delivered` and `cancelled` are terminal. */
export const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ["processing", "shipped", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

/** `paid` is terminal and is never downgraded. */
export const PAYMENT_TRANSITIONS: Record<PaymentStatus, readonly PaymentStatus[]> = {
  pending: ["paid", "failed"],
  paid: [],
  failed: ["paid"],
};

/** Shipping is independent from payment and fulfilment. */
export const SHIPPING_TRANSITIONS: Record<ShippingStatus, readonly ShippingStatus[]> = {
  pending: ["prepared", "shipped", "delivered", "cancelled", "returned"],
  prepared: ["shipped", "delivered", "cancelled", "returned"],
  shipped: ["delivered", "cancelled", "returned"],
  delivered: [],
  returned: [],
  cancelled: [],
};

export interface OrderStatusUpdateInput {
  orderStatus?: OrderStatus;
  paymentStatus?: PaymentStatus;
  shippingStatus?: ShippingStatus;
  reason?: string | null;
}

export interface StatusHistoryEntry {
  at: Date;
  actor: string;
  actorId: string | null;
  field: StatusField;
  from: string;
  to: string;
  reason: string | null;
}

export interface PlannedOrderUpdate {
  changes: StatusHistoryEntry[];
  /** True only for the first transition into `cancelled`. */
  releaseStock: boolean;
}

const transitionMessage = (field: StatusField, from: string, to: string): string =>
  `Illegal ${field} transition from "${from}" to "${to}"`;

const assertTransition = <Status extends string>(
  field: StatusField,
  from: Status,
  to: Status,
  allowed: Record<Status, readonly Status[]>,
): void => {
  if (from === to) {
    return;
  }
  if (!allowed[from].includes(to)) {
    throw new HttpError(400, transitionMessage(field, from, to));
  }
};

const readReason = (reason: string | null | undefined): string | null => {
  const trimmed = typeof reason === "string" ? reason.trim() : "";
  return trimmed ? trimmed : null;
};

/**
 * Validates an admin status update and produces the audit entries.
 * Throws before any database write when a transition is illegal.
 */
export const planOrderStatusUpdate = (
  order: Pick<IOrder, "orderStatus" | "paymentStatus" | "shippingStatus" | "stockReleasedAt">,
  input: OrderStatusUpdateInput,
  actor: { role: string; userId: string | null },
  now: Date = new Date(),
): PlannedOrderUpdate => {
  const reason = readReason(input.reason);
  const changes: StatusHistoryEntry[] = [];

  const addChange = (field: StatusField, from: string, to: string): void => {
    changes.push({
      at: now,
      actor: actor.role,
      actorId: actor.userId,
      field,
      from,
      to,
      reason,
    });
  };

  if (input.orderStatus !== undefined) {
    assertTransition("orderStatus", order.orderStatus, input.orderStatus, ORDER_TRANSITIONS);
    if (order.orderStatus !== input.orderStatus) {
      addChange("orderStatus", order.orderStatus, input.orderStatus);
    }
  }

  if (input.paymentStatus !== undefined) {
    assertTransition("paymentStatus", order.paymentStatus, input.paymentStatus, PAYMENT_TRANSITIONS);
    if (order.paymentStatus !== input.paymentStatus) {
      // A manual "paid" is a money-affecting action and must be attributable.
      if (input.paymentStatus === "paid" && !reason) {
        throw new HttpError(400, "A reason is required when an admin marks an order paid");
      }
      addChange("paymentStatus", order.paymentStatus, input.paymentStatus);
    }
  }

  if (input.shippingStatus !== undefined) {
    assertTransition("shippingStatus", order.shippingStatus, input.shippingStatus, SHIPPING_TRANSITIONS);
    if (order.shippingStatus !== input.shippingStatus) {
      addChange("shippingStatus", order.shippingStatus, input.shippingStatus);
    }
  }

  const releaseStock = order.orderStatus !== "cancelled" && input.orderStatus === "cancelled" && !order.stockReleasedAt;

  return { changes, releaseStock };
};

/** Human-readable status timeline entry written when an order is created. */
export const initialOrderHistory = (actorId: string, now: Date = new Date()): StatusHistoryEntry[] => [
  {
    at: now,
    actor: "user",
    actorId,
    field: "orderStatus",
    from: "none",
    to: "pending",
    reason: "Order created",
  },
];
