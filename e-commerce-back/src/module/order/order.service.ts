/** Order business logic: creation with stock deduction, totals, shipping, and
 * independent payment/order/shipping status management. */
import { Request, Response } from "express";
import mongoose from "mongoose";

import { env } from "../../../config/env.service.js";
import { HttpError } from "../../common/utils/httpError.js";
import {
  calculateOrderTotals,
  discountedUnitPrice,
  roundMoney,
} from "../../common/utils/pricing.js";
import { findVariant, parseVariants } from "../../common/validation/variant.js";
import { installationRequestModel } from "../../database/model/installation.model.js";
import { IOrder, orderModel } from "../../database/model/order.model.js";
import { productModel } from "../../database/model/product.model.js";

import { createCheckoutSession } from "./stripe.service.js";

interface OrderItemSnapshot {
  productId: string;
  quantity: number;
  price: number;
  en_name: string;
  ar_name?: string | null;
  fr_name?: string | null;
  color: string;
  size: string;
}

interface ShippingAddress {
  fullName: string;
  phone: string;
  street: string;
  city: string;
  state?: string;
  zipCode?: string;
  country: string;
}

interface InstallationInput {
  preferredDate?: string | Date;
  notes?: string;
}

const shippingConfig = () => ({
  type: env.SHIPPING_COST_TYPE,
  value: Number(env.SHIPPING_COST_VALUE) || 0,
});

const requireUserId = (req: Request): string => {
  const userId = req.user?._id;
  if (!userId) {throw new HttpError(401, "Unauthorized");}
  return userId;
};

const parseJson = <T>(raw: string, fallback: T): T => {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const serializeOrder = (order: IOrder) => ({
  ...order.toJSON(),
  items: parseJson<OrderItemSnapshot[]>(order.items, []),
  shippingAddress: parseJson<Partial<ShippingAddress>>(order.shippingAddress, {}),
  currency: env.CURRENCY,
});

const formatAddress = (address: ShippingAddress): string =>
  [address.street, address.city, address.state, address.zipCode, address.country]
    .filter(Boolean)
    .join(", ");

const createOrderInstallation = async (
  order: IOrder,
  userId: string,
  shippingAddress: ShippingAddress,
  installation: InstallationInput,
) =>
  installationRequestModel.create({
    orderId: order._id,
    userId,
    contactName: shippingAddress.fullName,
    phone: shippingAddress.phone,
    address: formatAddress(shippingAddress),
    preferredDate: installation.preferredDate ?? null,
    notes: installation.notes ?? null,
  });

/** Puts reserved stock back on the product variants (used when an order is cancelled). */
const restoreStock = async (items: OrderItemSnapshot[]): Promise<void> => {
  for (const item of items) {
    const product = await productModel.findById(item.productId);
    if (!product) {continue;}

    const variants = parseVariants(product.variants);
    const variant = findVariant(variants, item.color, item.size);
    if (!variant) {continue;}

    variant.stock += item.quantity;
    product.variants = JSON.stringify(variants);
    await product.save();
  }
};

/** Creates an order, reserves stock, and (for card payments) starts checkout. */
export const createOrder = async (req: Request, res: Response): Promise<void> => {
  const userId = requireUserId(req);
  const { items, paymentMethod, shippingAddress } = req.body as {
    items: { productId: string; color?: string; size?: string; quantity: number }[];
    paymentMethod: "cod" | "card";
    shippingAddress: ShippingAddress;
  };
  const installation = req.body.installation as
    | { preferredDate?: string; notes?: string }
    | undefined;
  const idempotencyKey: string | null = req.body.idempotencyKey || null;

  if (idempotencyKey) {
    const existing = await orderModel.findOne({ userId, idempotencyKey });
    if (existing) {
      res.status(200).json({
        message: "Order already exists",
        data: serializeOrder(existing),
      });
      return;
    }
  }

  const dbSession = await mongoose.startSession();
  const orderItems: OrderItemSnapshot[] = [];
  let order: IOrder | null = null;

  try {
    dbSession.startTransaction();

    for (const item of items) {
      const product = await productModel
        .findOne({ _id: item.productId, isActive: true })
        .session(dbSession);
      if (!product) {
        throw new HttpError(404, `Product with id ${item.productId} not found or inactive`);
      }

      const variants = parseVariants(product.variants);
      const variant = findVariant(variants, item.color, item.size);
      if (!variant) {
        throw new HttpError(
          400,
          `Variant ${item.color || "Default"}/${item.size || "Default"} not found for ${product.en_name}`,
        );
      }
      if (variant.stock < item.quantity) {
        throw new HttpError(
          400,
          `Insufficient stock for ${product.en_name} (${variant.color}/${variant.size}). Available: ${variant.stock}, requested: ${item.quantity}`,
        );
      }

      variant.stock -= item.quantity;
      product.variants = JSON.stringify(variants);
      await product.save({ session: dbSession });

      orderItems.push({
        productId: String(product._id),
        quantity: item.quantity,
        price: discountedUnitPrice(product.price, product.discount),
        en_name: product.en_name,
        ar_name: product.ar_name,
        fr_name: product.fr_name,
        color: variant.color,
        size: variant.size,
      });
    }

    const totals = calculateOrderTotals(
      orderItems.map((item) => ({ price: item.price, quantity: item.quantity })),
      shippingConfig(),
    );

    const created = await orderModel.create(
      [
        {
          userId,
          items: JSON.stringify(orderItems),
          subtotal: totals.subtotal,
          shippingCost: totals.shippingCost,
          totalAmount: totals.total,
          paymentMethod,
          paymentStatus: "pending",
          paymentProvider: paymentMethod === "card" ? env.paymentProvider : null,
          orderStatus: "pending",
          shippingStatus: "pending",
          shippingAddress: JSON.stringify(shippingAddress),
          installationRequested: Boolean(installation),
          idempotencyKey,
        },
      ],
      { session: dbSession },
    );

    order = created[0];
    await dbSession.commitTransaction();
  } catch (error) {
    await dbSession.abortTransaction();
    throw error;
  } finally {
    await dbSession.endSession();
  }

  if (!order) {throw new HttpError(500, "Order creation failed");}

  const orderData = serializeOrder(order);

  const attachInstallation = async (): Promise<void> => {
    if (!installation) {return;}

    const request = await createOrderInstallation(
      order,
      userId,
      shippingAddress,
      installation,
    );

    await orderModel.findByIdAndUpdate(order._id, {
      installationRequested: true,
      installationRequestId: request._id,
    });

    orderData.installationRequested = true;
    orderData.installationRequestId = request._id;
  };

  if (paymentMethod === "card") {
    const checkout = await createCheckoutSession(
      String(order._id),
      order.totalAmount,
      orderItems,
      order.shippingCost,
    );

    if (!checkout) {
      // Payment could not be started: release the reserved stock and close the
      // order so it does not linger in a payable state.
      await orderModel.findByIdAndUpdate(order._id, {
        paymentStatus: "failed",
        orderStatus: "cancelled",
        installationRequested: false,
        installationRequestId: null,
      });
      await restoreStock(orderItems);
      throw new HttpError(502, "Failed to create payment session");
    }

    await orderModel.findByIdAndUpdate(order._id, {
      paymentReference: checkout.id,
    });
    await attachInstallation();

    res.status(201).json({
      message: "Redirect to payment",
      data: { url: checkout.url, orderId: order._id, currency: env.CURRENCY },
    });
    return;
  }

  await attachInstallation();
  res.status(201).json({ message: "Order created", data: orderData });
};

/** Lists the caller's orders. */
export const getMyOrders = async (req: Request, res: Response): Promise<void> => {
  const userId = requireUserId(req);
  const orders = await orderModel.find({ userId }).sort({ createdAt: -1 });
  res.status(200).json({
    message: "Orders",
    data: { orders: orders.map(serializeOrder), currency: env.CURRENCY },
  });
};

/** Returns one order to its owner or to an admin. */
export const getOrderById = async (req: Request, res: Response): Promise<void> => {
  const userId = requireUserId(req);
  const order = await orderModel.findById(req.params.id);
  if (!order) {throw new HttpError(404, "Order not found");}

  const isAdmin = req.bearer === "admin" || req.bearer === "superAdmin";
  if (String(order.userId) !== userId && !isAdmin) {
    throw new HttpError(403, "Access denied");
  }

  res.status(200).json({ message: "Order", data: serializeOrder(order) });
};

/** Admin order listing. */
export const getAllOrders = async (req: Request, res: Response): Promise<void> => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));

  const [orders, total] = await Promise.all([
    orderModel
      .find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    orderModel.countDocuments(),
  ]);

  res.status(200).json({
    message: "Orders",
    data: { orders: orders.map(serializeOrder), total, page, limit, currency: env.CURRENCY },
  });
};

/**
 * Admin update of the independent order, payment, and shipping statuses.
 * Payment and shipping are never inferred from the order status.
 */
export const updateOrderStatus = async (req: Request, res: Response): Promise<void> => {
  const order = await orderModel.findById(req.params.id);
  if (!order) {throw new HttpError(404, "Order not found");}

  const { orderStatus, paymentStatus, shippingStatus, shippingCarrier, trackingNumber } =
    req.body;

  const previousOrderStatus = order.orderStatus;

  if (orderStatus !== undefined) {order.orderStatus = orderStatus;}
  if (paymentStatus !== undefined) {order.paymentStatus = paymentStatus;}
  if (shippingStatus !== undefined) {order.shippingStatus = shippingStatus;}
  if (shippingCarrier !== undefined) {order.shippingCarrier = shippingCarrier || null;}
  if (trackingNumber !== undefined) {order.trackingNumber = trackingNumber || null;}

  await order.save();

  // Returning stock is a decision, not a payment action: only do it on the
  // transition into "cancelled" and never twice.
  if (order.orderStatus === "cancelled" && previousOrderStatus !== "cancelled") {
    await restoreStock(parseJson<OrderItemSnapshot[]>(order.items, []));
  }

  res.status(200).json({ message: "Order updated", data: serializeOrder(order) });
};

/** Total paid revenue helper used by reports (kept small and explicit). */
export const sumPaidRevenue = (orders: Pick<IOrder, "paymentStatus" | "totalAmount">[]): number =>
  roundMoney(
    orders
      .filter((order) => order.paymentStatus === "paid")
      .reduce((sum, order) => sum + order.totalAmount, 0),
  );
