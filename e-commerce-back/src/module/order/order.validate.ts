/** Zod validation schemas for order endpoints. */
import { z } from "zod";

import { phoneSchema } from "../../common/validation/fields.js";
import { objectIdSchema } from "../../common/validation/objectId.js";
import { variantLabelSchema } from "../../common/validation/variant.js";
import { ORDER_STATUSES, PAYMENT_STATUSES, SHIPPING_STATUSES } from "../../database/model/order.model.js";
import { PAYMENT_METHOD_CODES } from "../payment/payment.types.js";

const quantity = z.coerce.number().int().min(1).max(1000);
const optionCode = z.string().trim().min(1).max(40);

const productItemSchema = z.looseObject({
  itemType: z.literal("product").optional(),
  productId: objectIdSchema,
  color: variantLabelSchema,
  size: variantLabelSchema,
  quantity,
});

/** Bundle lines carry option codes, never prices. */
const bundleItemSchema = z.looseObject({
  itemType: z.literal("bundle"),
  bundleId: objectIdSchema,
  hddOption: optionCode,
  installationOption: optionCode,
  quantity,
});

/**
 * A line is either a product variant or a configured bundle. The bundle shape is
 * tried first so `itemType: "bundle"` can never be parsed as a product line.
 */
export const orderItemValidate = z.union([bundleItemSchema, productItemSchema]);

const shippingAddressSchema = z.looseObject({
  fullName: z.string().trim().max(200),
  phone: phoneSchema,
  street: z.string().trim().max(500),
  city: z.string().trim().max(100),
  state: z.string().trim().max(100).optional(),
  zipCode: z.string().trim().max(20).optional(),
  country: z.string().trim().max(100),
});

/**
 * Schema for creating an order. Either explicit `items` or `useCart: true` must
 * be supplied; `useCart` builds the lines from the caller's stored cart. Prices
 * are never accepted from the client.
 */
export const createOrderValidate = z
  .looseObject({
    useCart: z.boolean().optional(),
    items: z.array(orderItemValidate).min(1).optional(),
    paymentMethod: z.enum(["cod", "card"]),
    /** Selected online method; ignored for COD and validated against the merchant list. */
    paymentMethodCode: z.enum(PAYMENT_METHOD_CODES).optional(),
    shippingAddress: shippingAddressSchema,
    installation: z
      .looseObject({
        preferredDate: z.coerce.date().optional(),
        notes: z.string().trim().max(1000).optional(),
      })
      .optional(),
    idempotencyKey: z.string().trim().max(100).nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.useCart && (!data.items || data.items.length === 0)) {
      ctx.addIssue({
        code: "custom",
        path: ["items"],
        message: "Provide a non-empty items array or set useCart to true",
      });
    }
  });

/** Schema for admin updates. At least one field must be supplied. */
export const updateOrderStatusValidate = z
  .looseObject({
    orderStatus: z.enum(ORDER_STATUSES).optional(),
    paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
    shippingStatus: z.enum(SHIPPING_STATUSES).optional(),
    shippingCarrier: z.string().trim().max(100).nullable().optional(),
    trackingNumber: z.string().trim().max(100).nullable().optional(),
    /** Required when an admin marks an order paid manually. */
    reason: z.string().trim().max(1000).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

/** Route params for an order id. */
export const orderIdParamsValidate = z.looseObject({
  id: objectIdSchema,
});

/** Route params for the support-friendly order-number lookup. */
export const orderNumberParamsValidate = z.looseObject({
  orderNumber: z
    .string()
    .trim()
    .min(5)
    .max(40)
    .regex(/^CCTV-[A-Z0-9-]+$/, "Invalid order number"),
});

/** Admin order filters (MVP-21). Unknown enums and sorts are rejected. */
export const orderListQueryValidate = z.looseObject({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  orderStatus: z.enum(ORDER_STATUSES).optional(),
  paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
  shippingStatus: z.enum(SHIPPING_STATUSES).optional(),
  sort: z.enum(["createdAt", "-createdAt", "totalAmount", "-totalAmount"]).optional(),
});

export type OrderListQuery = z.infer<typeof orderListQueryValidate>;

/** Body for the dedicated late-payment reconciliation endpoint (MVP-19). */
export const reconcilePaymentValidate = z.looseObject({
  resolution: z.enum(["paid", "cancelled"]),
  reason: z.string().trim().min(3).max(1000),
  reacquireStock: z.boolean().optional(),
});

/** Body for the admin expiry sweep. */
export const expireSweepValidate = z.looseObject({
  limit: z.coerce.number().int().min(1).max(200).optional(),
});
