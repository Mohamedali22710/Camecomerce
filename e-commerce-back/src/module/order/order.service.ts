/** Order business logic: creation from explicit lines or the stored cart,
 * server-side pricing, guarded status transitions, and one-time stock release. */
import { Request, Response } from "express";
import mongoose, { ClientSession, UpdateQuery } from "mongoose";

import { env } from "../../../config/env.service.js";
import { HttpError } from "../../common/utils/httpError.js";
import { toMinorUnits } from "../../common/utils/money.js";
import { calculateShipping, roundMoney } from "../../common/utils/pricing.js";
import { findVariant, parseVariants } from "../../common/validation/variant.js";
import { bundleModel } from "../../database/model/bundle.model.js";
import { cartModel } from "../../database/model/cart.model.js";
import { installationRequestModel } from "../../database/model/installation.model.js";
import { IOrder, IOrderStatusHistoryEntry, orderModel } from "../../database/model/order.model.js";
import { productModel } from "../../database/model/product.model.js";
import {
  OrderLineSnapshot,
  resolveBundleLine,
  resolveProductLine,
  sumLineTotals,
  toBundleSnapshot,
  toProductSnapshot,
} from "../cart/cart.lines.js";
import { getPaymentProvider } from "../payment/payment.registry.js";
import type { CreateSessionResult, PaymentProvider } from "../payment/payment.types.js";

import { initialOrderHistory, planOrderStatusUpdate } from "./order.lifecycle.js";
import { generateOrderNumber, legacyOrderNumber } from "./order.number.js";

interface ProductItemInput {
  itemType?: "product";
  productId: string;
  color?: string;
  size?: string;
  quantity: number;
}

interface BundleItemInput {
  itemType: "bundle";
  bundleId: string;
  hddOption: string;
  installationOption: string;
  quantity: number;
}

type OrderItemInput = ProductItemInput | BundleItemInput;

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
  if (!userId) {
    throw new HttpError(401, "Unauthorized");
  }
  return userId;
};

/**
 * Resolves the configured card adapter. In development the provider may be
 * unset, and a selected adapter may still be unconfigured; either way the caller
 * must get a safe 503 instead of a stack trace, and no order may be created.
 */
const resolveCardProvider = (): PaymentProvider => {
  try {
    return getPaymentProvider();
  } catch (error) {
    console.error("payment provider unavailable:", (error as Error)?.message);
    throw new HttpError(503, "The configured payment provider is unavailable.");
  }
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
  orderNumber: order.orderNumber || legacyOrderNumber(String(order._id)),
  items: parseJson<OrderLineSnapshot[]>(order.items, []),
  shippingAddress: parseJson<Partial<ShippingAddress>>(order.shippingAddress, {}),
  currency: env.CURRENCY,
});

const formatAddress = (address: ShippingAddress): string =>
  [address.street, address.city, address.state, address.zipCode, address.country].filter(Boolean).join(", ");

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

/** Reads the caller's cart as order-line inputs (product or bundle). */
const readCartItems = async (userId: string): Promise<OrderItemInput[]> => {
  const lines = await cartModel.find({ userId }).sort({ createdAt: 1 });
  if (lines.length === 0) {
    throw new HttpError(400, "Cart is empty. Add items or send an explicit items array");
  }

  return lines.map((line): OrderItemInput => {
    if (line.itemType === "bundle") {
      return {
        itemType: "bundle",
        bundleId: String(line.bundleId),
        hddOption: line.hddOption ?? "",
        installationOption: line.installationOption ?? "",
        quantity: line.quantity,
      };
    }
    return {
      productId: String(line.productId),
      color: line.color,
      size: line.size,
      quantity: line.quantity,
    };
  });
};

/**
 * Re-resolves every requested line against the database inside the order
 * transaction. Prices and snapshots come from stored data only. Product stock is
 * reserved here; bundle stock is intentionally untouched (DEC-01).
 */
const resolveOrderLines = async (items: OrderItemInput[], session: ClientSession): Promise<OrderLineSnapshot[]> => {
  const snapshots: OrderLineSnapshot[] = [];

  for (const item of items) {
    if (item.itemType === "bundle") {
      const bundle = await bundleModel.findOne({ _id: item.bundleId, isActive: true }).session(session);
      if (!bundle) {
        throw new HttpError(404, `Bundle with id ${item.bundleId} not found or inactive`);
      }

      const resolved = resolveBundleLine(bundle, item);
      snapshots.push(toBundleSnapshot(resolved));
      continue;
    }

    const product = await productModel.findOne({ _id: item.productId, isActive: true }).session(session);
    if (!product) {
      throw new HttpError(404, `Product with id ${item.productId} not found or inactive`);
    }

    const resolved = resolveProductLine(product, item, { enforceStock: true });

    const variants = parseVariants(product.variants);
    const variant = findVariant(variants, resolved.variant.color, resolved.variant.size);
    if (!variant) {
      throw new HttpError(
        400,
        `Variant ${resolved.variant.color}/${resolved.variant.size} not found for ${product.en_name}`,
      );
    }
    if (variant.stock < resolved.quantity) {
      throw new HttpError(
        400,
        `Insufficient stock for ${product.en_name} (${variant.color}/${variant.size}). Available: ${variant.stock}, requested: ${resolved.quantity}`,
      );
    }

    variant.stock -= resolved.quantity;
    product.variants = JSON.stringify(variants);
    await product.save({ session });

    snapshots.push(toProductSnapshot(resolved));
  }

  return snapshots;
};

/**
 * Adds reserved product stock back inside the caller's transaction. Bundle lines
 * are skipped because bundle component inventory is still design-only (DEC-01).
 *
 * A missing product or variant is a data-integrity failure, not a no-op: silently
 * skipping it would permanently lose inventory with no audit trail.
 */
const restoreProductStock = async (lines: OrderLineSnapshot[], session: ClientSession): Promise<void> => {
  for (const line of lines) {
    if (line.itemType === "bundle") {
      continue;
    }

    const product = await productModel.findById(line.productId).session(session);
    if (!product) {
      throw new HttpError(
        409,
        `Cannot release stock: product ${line.productId} referenced by this order no longer exists`,
      );
    }

    const variants = parseVariants(product.variants);
    const variant = findVariant(variants, line.color, line.size);
    if (!variant) {
      throw new HttpError(
        409,
        `Cannot release stock: variant ${line.color}/${line.size} of ${product.en_name} no longer exists`,
      );
    }

    variant.stock += line.quantity;
    product.variants = JSON.stringify(variants);
    await product.save({ session });
  }
};

/** Allocates a collision-free order number before inserting the order. */
const allocateOrderNumber = async (session: ClientSession): Promise<string> => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = generateOrderNumber();
    const exists = await orderModel.exists({ orderNumber: candidate }).session(session);
    if (!exists) {
      return candidate;
    }
  }
  throw new HttpError(500, "Could not allocate a unique order number");
};

/**
 * Cancels an order that never reached a payable state and releases its stock
 * exactly once by claiming `stockReleasedAt` atomically.
 */
const cancelOrderAndReleaseStock = async (order: IOrder, reason: string): Promise<boolean> => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const now = new Date();
    const claimed = await orderModel.findOneAndUpdate(
      // Never restock an order the provider has already settled, and never
      // release twice. Both conditions are re-checked inside the write.
      { _id: order._id, stockReleasedAt: null, paymentStatus: { $ne: "paid" } },
      {
        $set: {
          stockReleasedAt: now,
          paymentStatus: "failed",
          orderStatus: "cancelled",
          installationRequested: false,
          installationRequestId: null,
        },
        $push: {
          statusHistory: {
            $each: [
              {
                at: now,
                actor: "system",
                actorId: null,
                field: "paymentStatus",
                from: order.paymentStatus,
                to: "failed",
                reason,
              },
              {
                at: now,
                actor: "system",
                actorId: null,
                field: "orderStatus",
                from: order.orderStatus,
                to: "cancelled",
                reason,
              },
            ] satisfies IOrderStatusHistoryEntry[],
          },
        },
      },
      { new: true, session },
    );

    if (!claimed) {
      await session.abortTransaction();
      return false;
    }

    await restoreProductStock(parseJson<OrderLineSnapshot[]>(claimed.items, []), session);
    await session.commitTransaction();
    return true;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
};

/** Creates an order, reserves product stock, and (for card) starts checkout. */
export const createOrder = async (req: Request, res: Response): Promise<void> => {
  const userId = requireUserId(req);
  const body = req.body as {
    useCart?: boolean;
    items?: OrderItemInput[];
    paymentMethod: "cod" | "card";
    shippingAddress: ShippingAddress;
    installation?: InstallationInput;
    idempotencyKey?: string | null;
  };
  const { paymentMethod, shippingAddress } = body;
  const installation = body.installation;
  const idempotencyKey = body.idempotencyKey || null;

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

  const useCart = Boolean(body.useCart) || !body.items?.length;
  const requestedItems = useCart ? await readCartItems(userId) : body.items!;

  // Resolve the card provider before any write: a misconfigured provider must
  // never leave a persisted order holding reserved stock.
  const cardProvider = paymentMethod === "card" ? resolveCardProvider() : null;

  const dbSession = await mongoose.startSession();
  let order: IOrder | null = null;

  try {
    dbSession.startTransaction();

    const orderItems = await resolveOrderLines(requestedItems, dbSession);
    const subtotal = sumLineTotals(orderItems);
    const shippingCost = calculateShipping(subtotal, shippingConfig());
    const totalAmount = roundMoney(subtotal + shippingCost);
    const orderNumber = await allocateOrderNumber(dbSession);

    const created = await orderModel.create(
      [
        {
          userId,
          orderNumber,
          items: JSON.stringify(orderItems),
          subtotal,
          shippingCost,
          totalAmount,
          paymentMethod,
          paymentStatus: "pending",
          // The concrete provider is recorded only after a session is created.
          paymentProvider: null,
          orderStatus: "pending",
          shippingStatus: "pending",
          shippingAddress: JSON.stringify(shippingAddress),
          installationRequested: Boolean(installation),
          idempotencyKey,
          statusHistory: initialOrderHistory(userId),
          stockReleasedAt: null,
          paymentAttempts: [],
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

  if (!order) {
    throw new HttpError(500, "Order creation failed");
  }

  const orderItems = parseJson<OrderLineSnapshot[]>(order.items, []);
  const orderData = serializeOrder(order);

  const attachInstallation = async (): Promise<void> => {
    if (!installation) {
      return;
    }

    const request = await createOrderInstallation(order!, userId, shippingAddress, installation);

    await orderModel.findByIdAndUpdate(order!._id, {
      installationRequested: true,
      installationRequestId: request._id,
    });

    orderData.installationRequested = true;
    orderData.installationRequestId = request._id;
  };

  /** Clears the cart only after a successful response path. */
  const clearUsedCart = async (): Promise<void> => {
    if (useCart) {
      await cartModel.deleteMany({ userId });
    }
  };

  if (paymentMethod === "card") {
    if (!cardProvider) {
      throw new HttpError(503, "The configured payment provider is unavailable.");
    }
    const provider = cardProvider;
    // PAYMENT_PROVIDER is authoritative. The order flow never imports a provider
    // SDK, so selecting Paymob cannot silently create a Stripe session. A
    // configured-but-unavailable adapter (Paymob today) throws HttpError(503).
    let checkout: CreateSessionResult;

    try {
      checkout = await provider.createSession({
        orderId: String(order._id),
        orderNumber: orderData.orderNumber,
        amountMinor: toMinorUnits(order.totalAmount),
        currency: env.CURRENCY,
        items: orderItems.map((line) => ({
          name: line.en_name,
          quantity: line.quantity,
          unitAmountMinor: toMinorUnits(line.itemType === "bundle" ? line.unitPrice : line.price),
          sku: line.itemType === "bundle" ? `bundle:${line.bundleId}` : `product:${line.productId}`,
        })),
        customer: {
          fullName: shippingAddress.fullName,
          phone: shippingAddress.phone,
          street: shippingAddress.street,
          city: shippingAddress.city,
          state: shippingAddress.state,
          zipCode: shippingAddress.zipCode,
          country: shippingAddress.country,
        },
        notificationUrl: `${env.base_url}/v1/order/webhook`,
        redirectionUrl: `${env.frontendUrl}/checkout/success?orderId=${encodeURIComponent(String(order._id))}`,
      });
    } catch (error) {
      // Payment could not be started: release the reservation once and close the
      // order so it never lingers in a payable state.
      await cancelOrderAndReleaseStock(order, "Payment session could not be created");
      if (error instanceof HttpError) {
        throw error;
      }
      throw new HttpError(502, "Failed to create payment session");
    }

    await orderModel.findByIdAndUpdate(order._id, {
      paymentProvider: provider.name,
      paymentReference: checkout.providerReference,
    });
    await attachInstallation();
    await clearUsedCart();

    res.status(201).json({
      message: "Redirect to payment",
      data: {
        url: checkout.redirectUrl,
        redirectUrl: checkout.redirectUrl,
        provider: checkout.provider,
        orderId: order._id,
        orderNumber: orderData.orderNumber,
        currency: env.CURRENCY,
        paymentStatus: checkout.paymentStatus,
      },
    });
    return;
  }

  await attachInstallation();
  await clearUsedCart();
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

/** Returns one order to its owner or to an admin. Non-owners get 404. */
export const getOrderById = async (req: Request, res: Response): Promise<void> => {
  const userId = requireUserId(req);
  const order = await orderModel.findById(req.params.id);
  if (!order) {
    throw new HttpError(404, "Order not found");
  }

  const isAdmin = req.bearer === "admin" || req.bearer === "superAdmin";
  if (String(order.userId) !== userId && !isAdmin) {
    // Do not reveal that the order exists.
    throw new HttpError(404, "Order not found");
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
 *
 * The status write, the one-time `stockReleasedAt` claim, the stock restoration,
 * and the audit entries all run in ONE transaction. MongoDB evaluates the
 * concurrency guards inside the claiming write, so two concurrent cancellations
 * cannot both restore stock, a paid order is never restocked, and
 * a cancelled order whose marker is still `null` can be repaired by repeating
 * the request.
 */
export const updateOrderStatus = async (req: Request, res: Response): Promise<void> => {
  const { orderStatus, paymentStatus, shippingStatus, shippingCarrier, trackingNumber, reason } = req.body;
  const actor = { role: req.bearer || req.user?.role || "admin", userId: req.user?._id ?? null };

  const session = await mongoose.startSession();
  let updatedOrder: IOrder | null = null;

  try {
    session.startTransaction();

    const order = await orderModel.findById(req.params.id).session(session);
    if (!order) {
      throw new HttpError(404, "Order not found");
    }

    // Re-validated inside the transaction so the decision is based on the current
    // document, not on a value read before the session opened.
    const plan = planOrderStatusUpdate(order, { orderStatus, paymentStatus, shippingStatus, reason }, actor);

    const setFields: Partial<IOrder> = {};
    if (orderStatus !== undefined) {
      setFields.orderStatus = orderStatus;
    }
    if (paymentStatus !== undefined) {
      setFields.paymentStatus = paymentStatus;
    }
    if (shippingStatus !== undefined) {
      setFields.shippingStatus = shippingStatus;
    }
    if (shippingCarrier !== undefined) {
      setFields.shippingCarrier = shippingCarrier || null;
    }
    if (trackingNumber !== undefined) {
      setFields.trackingNumber = trackingNumber || null;
    }
    if (plan.releaseStock) {
      setFields.stockReleasedAt = new Date();
    }

    // Concurrency guards. Every field this request changes must still hold the
    // value that was validated, and the release must still be unclaimed for an
    // unpaid order. MongoDB evaluates all of them inside the same write.
    const guards: Record<string, unknown> = { _id: order._id };
    if (orderStatus !== undefined) {
      guards.orderStatus = order.orderStatus;
    }
    if (paymentStatus !== undefined) {
      guards.paymentStatus = order.paymentStatus;
    }
    if (shippingStatus !== undefined) {
      guards.shippingStatus = order.shippingStatus;
    }
    if (plan.releaseStock) {
      guards.stockReleasedAt = null;
      // When the request also submits a payment status, the equality guard above
      // already proves the current value is not "paid".
      if (paymentStatus === undefined) {
        guards.paymentStatus = { $ne: "paid" };
      }
    }

    const update: UpdateQuery<IOrder> = {};
    if (Object.keys(setFields).length > 0) {
      update.$set = setFields;
    }
    if (plan.changes.length > 0) {
      update.$push = { statusHistory: { $each: plan.changes } };
    }

    if (Object.keys(update).length === 0) {
      // Nothing to change and nothing to release: idempotent request.
      updatedOrder = order;
      await session.commitTransaction();
    } else {
      updatedOrder = await orderModel.findOneAndUpdate(guards, update, {
        new: true,
        session,
      });

      if (!updatedOrder) {
        throw new HttpError(409, "Order changed while it was being updated. Reload and retry.");
      }

      if (plan.releaseStock) {
        // Throws on a missing product/variant, aborting the claim and the status
        // change together instead of silently losing inventory.
        await restoreProductStock(parseJson<OrderLineSnapshot[]>(updatedOrder.items, []), session);
      }

      await session.commitTransaction();
    }
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }

  res.status(200).json({ message: "Order updated", data: serializeOrder(updatedOrder) });
};

/** Total paid revenue helper used by reports (kept small and explicit). */
export const sumPaidRevenue = (orders: Pick<IOrder, "paymentStatus" | "totalAmount">[]): number =>
  roundMoney(
    orders.filter((order) => order.paymentStatus === "paid").reduce((sum, order) => sum + order.totalAmount, 0),
  );
