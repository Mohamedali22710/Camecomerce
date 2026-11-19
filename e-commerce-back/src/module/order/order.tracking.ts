/** Customer-facing tracking projection (MVP-22).
 *
 * Pure so the field-exclusion rules are testable without a database. Provider
 * references, actor ids, and admin reasons are deliberately absent.
 */
import { env } from "../../../config/env.service.js";
import type { IOrder } from "../../database/model/order.model.js";

import { legacyOrderNumber } from "./order.number.js";

export interface TrackingEvent {
  at: Date;
  field: string;
  from: string;
  to: string;
}

export interface TrackingResponse {
  orderNumber: string;
  orderStatus: string;
  paymentStatus: string;
  shippingStatus: string;
  shippingCarrier: string | null;
  trackingNumber: string | null;
  estimatedDelivery: string | null;
  currency: string;
  events: TrackingEvent[];
}

type TrackingSource = Pick<
  IOrder,
  | "orderNumber"
  | "orderStatus"
  | "paymentStatus"
  | "shippingStatus"
  | "shippingCarrier"
  | "trackingNumber"
  | "statusHistory"
>;

export const serializeTracking = (order: TrackingSource & { _id?: unknown }): TrackingResponse => ({
  orderNumber: order.orderNumber || legacyOrderNumber(String(order._id)),
  orderStatus: order.orderStatus,
  paymentStatus: order.paymentStatus,
  shippingStatus: order.shippingStatus,
  shippingCarrier: order.shippingCarrier ?? null,
  trackingNumber: order.trackingNumber ?? null,
  estimatedDelivery: null,
  currency: env.CURRENCY,
  events: [...order.statusHistory]
    .sort((a, b) => a.at.getTime() - b.at.getTime())
    .map((event) => ({
      at: event.at,
      field: event.field,
      from: event.from,
      to: event.to,
    })),
});
