/** Zod validation schemas for order endpoints. */
import { z } from "zod";

import { phoneSchema } from "../../common/validation/fields.js";
import { objectIdSchema } from "../../common/validation/objectId.js";
import { variantLabelSchema } from "../../common/validation/variant.js";
import {
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  SHIPPING_STATUSES,
} from "../../database/model/order.model.js";

const itemSchema = z.looseObject({
  productId: objectIdSchema,
  color: variantLabelSchema,
  size: variantLabelSchema,
  quantity: z.coerce.number().int().min(1).max(1000),
});

const shippingAddressSchema = z.looseObject({
  fullName: z.string().trim().max(200),
  phone: phoneSchema,
  street: z.string().trim().max(500),
  city: z.string().trim().max(100),
  state: z.string().trim().max(100).optional(),
  zipCode: z.string().trim().max(20).optional(),
  country: z.string().trim().max(100),
});

/** Schema for creating an order. Presence of `installation` requests installation. */
export const createOrderValidate = z.looseObject({
  items: z.array(itemSchema).min(1),
  paymentMethod: z.enum(["cod", "card"]),
  shippingAddress: shippingAddressSchema,
  installation: z
    .looseObject({
      preferredDate: z.coerce.date().optional(),
      notes: z.string().trim().max(1000).optional(),
    })
    .optional(),
  idempotencyKey: z.string().trim().max(100).nullable().optional(),
});

/** Schema for admin updates. At least one field must be supplied. */
export const updateOrderStatusValidate = z
  .looseObject({
    orderStatus: z.enum(ORDER_STATUSES).optional(),
    paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
    shippingStatus: z.enum(SHIPPING_STATUSES).optional(),
    shippingCarrier: z.string().trim().max(100).nullable().optional(),
    trackingNumber: z.string().trim().max(100).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });
