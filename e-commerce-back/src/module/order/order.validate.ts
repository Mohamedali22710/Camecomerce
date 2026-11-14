/** Joi validation schemas for order endpoints. */
import Joi from "joi";

import { objectIdSchema } from "../../common/validation/objectId.js";
import { DEFAULT_VARIANT_VALUE } from "../../common/validation/variant.js";
import {
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  SHIPPING_STATUSES,
} from "../../database/model/order.model.js";

const variantLabel = Joi.string()
  .trim()
  .max(50)
  .default(DEFAULT_VARIANT_VALUE);

const itemSchema = Joi.object({
  productId: objectIdSchema.required(),
  color: variantLabel.optional(),
  size: variantLabel.optional(),
  quantity: Joi.number().integer().min(1).max(1000).required(),
});

/** Schema for creating an order. Presence of `installation` requests installation. */
export const createOrderValidate = Joi.object({
  items: Joi.array().items(itemSchema).min(1).required(),
  paymentMethod: Joi.string().valid("cod", "card").required(),
  shippingAddress: Joi.object({
    fullName: Joi.string().trim().max(200).required(),
    phone: Joi.string()
      .pattern(/^\+?[1-9]\d{6,14}$/)
      .required(),
    street: Joi.string().trim().max(500).required(),
    city: Joi.string().trim().max(100).required(),
    state: Joi.string().trim().max(100).optional().allow(""),
    zipCode: Joi.string().trim().max(20).optional().allow(""),
    country: Joi.string().trim().max(100).required(),
  }).required(),
  installation: Joi.object({
    preferredDate: Joi.date().iso().optional(),
    notes: Joi.string().trim().max(1000).optional().allow(""),
  }).optional(),
  idempotencyKey: Joi.string().trim().max(100).optional().allow("", null),
});

/** Schema for admin updates. At least one field must be supplied. */
export const updateOrderStatusValidate = Joi.object({
  orderStatus: Joi.string()
    .valid(...ORDER_STATUSES)
    .optional(),
  paymentStatus: Joi.string()
    .valid(...PAYMENT_STATUSES)
    .optional(),
  shippingStatus: Joi.string()
    .valid(...SHIPPING_STATUSES)
    .optional(),
  shippingCarrier: Joi.string().trim().max(100).optional().allow("", null),
  trackingNumber: Joi.string().trim().max(100).optional().allow("", null),
}).min(1);
