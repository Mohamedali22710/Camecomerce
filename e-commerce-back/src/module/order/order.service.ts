/** Order business logic: creation from explicit lines or the stored cart,
 * server-side pricing, guarded status transitions, idempotent stock release,
 * payment inquiry sync, reconciliation, and customer tracking.
 */
import { Request, Response } from "express";
import mongoose, { ClientSession, UpdateQuery } from "mongoose";

import { env } from "../../../config/env.service.js";
import { HttpError } from "../../common/utils/httpError.js";
import { toMinorUnits } from "../../common/utils/money.js";
import { calculateShipping, roundMoney } from "../../common/utils/pricing.js";
import { RequestWithValidatedQuery } from "../../common/utils/validate.js";
import { findVariant, parseVariants } from "../../common/validation/variant.js";
import { bundleModel } from "../../database/model/bundle.model.js";
import { cartModel } from "../../database/model/cart.model.js";
import { installationRequestModel } from "../../database/model/installation.model.js";
import { IOrder, IOrderStatusHistoryEntry, orderModel } from "../../database/model/order.model.js";
import { productModel } from "../../database/model/product.model.js";
import { getEffectiveShippingConfig } from "../setting/setting.service.js";
import {
  OrderLineSnapshot,
  resolveBundleLine,
  resolveProductLine,
  sumLineTotals,
  toBundleSnapshot,
  toProductSnapshot,
} from "../cart/cart.lines.js";
import { assertPaymentMethodEnabled } from "../payment/payment.methods.js";
import { getPaymentProvider } from "../payment/payment.registry.js";
import { settlePaymentEvent } from "../payment/payment.settlement.js";
import type {
  CreateSessionResult,
  PaymentMethodCode,
  PaymentProvider,
  VerifiedPaymentEvent,
} from "../payment/payment.types.js";

import { expireOrderIfNeeded, expireStaleOrders } from "./order.expiry.js";
import { initialOrderHistory, planOrderStatusUpdate } from "./order.lifecycle.js";
import { generateOrderNumber, legacyOrderNumber } from "./order.number.js";
import {
  collectStockRequirements,
  parseOrderItems,
  releaseStock,
  reserveStock,
} from "./order.stock.js";
import { serializeTracking } from "./order.tracking.js";
import type { OrderListQuery } from "./order.validate.js";

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

const requireUserId = (req: Request): string => {
  const userId = req.user?._id;
  if (!userId) {
    throw new HttpError(401, "Unauthorized");
  }
  return userId;
};

const isAdmin = (req: Request): boolean => req.bearer === "admin" || req.bearer === "superAdmin";

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
 * transaction. Prices and snapshots come from stored data only. Product and
 * bundle-component stock is reserved afterwards in one aggregated pass.
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

    const resolved = resolveProductLine(product, item, { enforceStock: false });
    const variants = parseVariants(product.variants);
    if (!findVariant(variants, resolved.variant.color, resolved.variant.size)) {
      throw new HttpError(
        400,
        `Variant ${resolved.variant.color}/${resolved.variant.size} not found for ${product.en_name}`,
      );
    }

    snapshots.push(toProductSnapshot(resolved));
  }

  await reserveStock(collectStockRequirements(snapshots), session);
  return snapshots;
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
      // Never restock an order the provider has already settled or flagged, and
      // never release twice. Both conditions are re-checked inside the write.
      { _id: order._id, stockReleasedAt: null, paymentStatus: { $nin: ["paid", "reconciliation_required"] } },
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

    await releaseStock(collectStockRequirements(parseOrderItems(claimed.items)), session);
    await session.commitTransaction();
    return true;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
};

/** Creates an order, reserves stock, and (for card) starts checkout. */
export const createOrder = async (req: Request, res: Response): Promise<void> => {
  const userId = requireUserId(req);
  const body = req.body as {
    useCart?: boolean;
    items?: OrderItemInput[];
    paymentMethod: "cod" | "card";
    /** Optional online method when `paymentMethod` is `card`. */
    paymentMethodCode?: string;
    shippingAddress: ShippingAddress;
    installation?: InstallationInput;
    idempotencyKey?: string | null;
  };
  const { paymentMethod, shippingAddress } = body;
  const installation = body.installation;
  const idempotencyKey = body.idempotencyKey || null;

  if (paymentMethod === "cod" && body.paymentMethodCode) {
    throw new HttpError(400, "paymentMethodCode is only valid when paymentMethod is card");
  }

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

  // Resolve and validate the card provider/method before any write: a
  // misconfigured provider or a disabled method must never leave a persisted
  // order holding reserved stock.
  const methodCode: PaymentMethodCode = paymentMethod === "card"
    ? assertPaymentMethodEnabled(body.paymentMethodCode ?? "card")
    : "card";
  const cardProvider = paymentMethod === "card" ? resolveCardProvider() : null;

  const dbSession = await mongoose.startSession();
  let order: IOrder | null = null;

  try {
    dbSession.startTransaction();

    const orderItems = await resolveOrderLines(requestedItems, dbSession);
    const subtotal = sumLineTotals(orderItems);
    const shipping = await getEffectiveShippingConfig();
    const shippingCost = calculateShipping(subtotal, shipping);
    const totalAmount = roundMoney(subtotal + shippingCost);
    const orderNumber = await allocateOrderNumber(dbSession);
    const now = new Date();
    const expiresAt =
      paymentMethod === "card" ? new Date(now.getTime() + env.PAYMENT_ORDER_TTL_MINUTES * 60_000) : null;

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
          expiresAt,
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
    let checkout: CreateSessionResult;

    try {
      checkout = await provider.createSession({
        orderId: String(order._id),
        orderNumber: orderData.orderNumber,
        amountMinor: toMinorUnits(order.totalAmount),
        shippingMinor: toMinorUnits(order.shippingCost),
        currency: env.CURRENCY,
        method: methodCode,
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
        notificationUrl: `${env.base_url}/v1/payment/paymob/webhook`,
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
      paymentIntentionId: checkout.providerSessionId,
      lastPaymentSyncAt: null,
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
  let order = await orderModel.findById(req.params.id);
  if (!order) {
    throw new HttpError(404, "Order not found");
  }

  if (String(order.userId) !== userId && !isAdmin(req)) {
    // Do not reveal that the order exists.
    throw new HttpError(404, "Order not found");
  }

  // Lazy expiry: a read of an abandoned card order releases its stock once.
  if (await expireOrderIfNeeded(order)) {
    order = (await orderModel.findById(order._id)) ?? order;
  }

  res.status(200).json({ message: "Order", data: serializeOrder(order) });
};

/** Admin order listing with validated filters and a restricted sort. */
export const getAllOrders = async (req: Request, res: Response): Promise<void> => {
  const query = ((req as RequestWithValidatedQuery<OrderListQuery>).validatedQuery ?? req.query) as OrderListQuery;

  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 50));

  const filter: Record<string, unknown> = {};
  if (query.orderStatus) {
    filter.orderStatus = query.orderStatus;
  }
  if (query.paymentStatus) {
    filter.paymentStatus = query.paymentStatus;
  }
  if (query.shippingStatus) {
    filter.shippingStatus = query.shippingStatus;
  }

  const sort: Record<string, 1 | -1> =
    query.sort === "createdAt"
      ? { createdAt: 1 }
      : query.sort === "totalAmount"
        ? { totalAmount: 1 }
        : query.sort === "-totalAmount"
          ? { totalAmount: -1 }
          : { createdAt: -1 };

  const [orders, total] = await Promise.all([
    orderModel
      .find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit),
    orderModel.countDocuments(filter),
  ]);

  res.status(200).json({
    message: "Orders",
    data: { orders: orders.map(serializeOrder), total, page, limit, currency: env.CURRENCY },
  });
};

/** GET /v1/order/:id/tracking — owner or admin. */
export const getOrderTracking = async (req: Request, res: Response): Promise<void> => {
  const userId = requireUserId(req);
  const order = await orderModel.findById(req.params.id);
  if (!order) {
    throw new HttpError(404, "Order not found");
  }
  if (String(order.userId) !== userId && !isAdmin(req)) {
    throw new HttpError(404, "Order not found");
  }

  res.status(200).json({ message: "Order tracking", data: serializeTracking(order) });
};

/** GET /v1/order/track/:orderNumber — owner only, support-friendly links. */
export const getOrderTrackingByNumber = async (req: Request, res: Response): Promise<void> => {
  const userId = requireUserId(req);
  const order = await orderModel.findOne({ orderNumber: String(req.params.orderNumber ?? "") });
  if (!order || String(order.userId) !== userId) {
    // Same response for missing and foreign orders: existence is not disclosed.
    throw new HttpError(404, "Order not found");
  }

  res.status(200).json({ message: "Order tracking", data: serializeTracking(order) });
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
        await releaseStock(collectStockRequirements(parseOrderItems(updatedOrder.items)), session);
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

const SYNC_DEBOUNCE_MS = 10_000;

/**
 * POST /v1/order/admin/:id/sync-payment — asks Paymob for the authoritative
 * state and applies it through the same settlement path as the webhook.
 *
 * A provider error leaves the order untouched. Repeated clicks are debounced.
 */
export const syncOrderPayment = async (req: Request, res: Response): Promise<void> => {
  const order = await orderModel.findById(req.params.id);
  if (!order) {
    throw new HttpError(404, "Order not found");
  }
  if (order.paymentMethod !== "card") {
    throw new HttpError(409, "Only card orders have a provider payment to sync");
  }
  if (order.paymentStatus === "paid") {
    res.status(200).json({
      message: "Payment already settled",
      data: { changed: false, paymentStatus: order.paymentStatus, result: "duplicate" },
    });
    return;
  }

  const reference = order.paymentReference || order.paymentIntentionId;
  if (!reference) {
    throw new HttpError(409, "This order has no provider reference to inquire about");
  }

  if (order.lastPaymentSyncAt && Date.now() - order.lastPaymentSyncAt.getTime() < SYNC_DEBOUNCE_MS) {
    throw new HttpError(429, "Payment sync was run moments ago. Try again in a few seconds.");
  }

  const provider = resolveCardProvider();
  const inquiry = await provider.fetchStatus(reference);

  if (!inquiry.providerTransactionId) {
    // Nothing was attempted yet. Record the check time without inventing a state.
    await orderModel.updateOne({ _id: order._id }, { $set: { lastPaymentSyncAt: new Date() } });
    res.status(200).json({
      message: "No provider transaction yet",
      data: { changed: false, paymentStatus: order.paymentStatus, result: "pending" },
    });
    return;
  }

  if (inquiry.amountMinor === null || !inquiry.currency) {
    throw new HttpError(502, "Paymob returned an incomplete inquiry response. Local state was not changed.");
  }

  const event: VerifiedPaymentEvent = {
    provider: provider.name,
    providerTransactionId: inquiry.providerTransactionId,
    providerReference: inquiry.providerReference || reference,
    providerSessionId: order.paymentIntentionId ?? null,
    orderNumber: order.orderNumber || legacyOrderNumber(String(order._id)),
    status: inquiry.status,
    success: inquiry.success,
    amountMinor: inquiry.amountMinor,
    currency: inquiry.currency,
    verified: true,
    source: "inquiry",
    payload: {},
  };

  const outcome = await settlePaymentEvent(event);
  await orderModel.updateOne({ _id: order._id }, { $set: { lastPaymentSyncAt: new Date() } });
  const fresh = await orderModel.findById(order._id);

  res.status(200).json({
    message: "Payment sync complete",
    data: {
      changed: outcome.changed,
      result: outcome.result,
      paymentStatus: fresh?.paymentStatus ?? order.paymentStatus,
    },
  });
};

export interface ReconcilePaymentBody {
  resolution: "paid" | "cancelled";
  reason: string;
  /** Required when paying an order whose stock hold was released. */
  reacquireStock?: boolean;
}

/**
 * POST /v1/order/admin/:id/reconcile-payment — the only path allowed to mark a
 * late/mismatched payment as paid.
 *
 * Paying after expiry requires `reacquireStock: true`: stock is reserved again
 * in the same transaction, so the order never ends up paid without inventory
 * and inventory is never deducted twice by accident.
 */
export const reconcileOrderPayment = async (req: Request, res: Response): Promise<void> => {
  const body = req.body as ReconcilePaymentBody;
  const reason = String(body.reason ?? "").trim();
  const actor = { role: req.bearer || req.user?.role || "admin", userId: req.user?._id ?? null };

  if (!reason) {
    throw new HttpError(400, "A reason is required for a manual reconciliation");
  }

  const session = await mongoose.startSession();
  let order: IOrder | null = null;

  try {
    session.startTransaction();

    const current = await orderModel.findById(req.params.id).session(session);
    if (!current) {
      throw new HttpError(404, "Order not found");
    }
    if (current.paymentMethod !== "card") {
      throw new HttpError(409, "Only card orders can be reconciled");
    }

    const now = new Date();
    const setFields: Record<string, unknown> = {};
    const history: IOrderStatusHistoryEntry[] = [];
    const guards: Record<string, unknown> = {
      _id: current._id,
      paymentStatus: current.paymentStatus,
      // Proves the release/re-acquire decision still matches committed state.
      stockReleasedAt: current.stockReleasedAt ?? null,
    };

    if (body.resolution === "paid") {
      if (current.paymentStatus === "paid") {
        // Idempotent: nothing to change, but the transaction still closes below.
        order = current;
      } else {
        if (current.stockReleasedAt) {
          if (!body.reacquireStock) {
            throw new HttpError(
              400,
              "Stock was released for this order. Retry with reacquireStock: true to reserve it again before marking paid.",
            );
          }
          // Throws (and aborts) when the inventory is no longer available.
          await reserveStock(collectStockRequirements(parseOrderItems(current.items)), session);
          setFields.stockReleasedAt = null;
          setFields.stockReacquiredAt = now;
        }

        setFields.paymentStatus = "paid";
        setFields.paymentProvider = current.paymentProvider || "paymob";
        history.push({
          at: now,
          actor: actor.role,
          actorId: actor.userId,
          field: "paymentStatus",
          from: current.paymentStatus,
          to: "paid",
          reason,
        });
      }
    } else {
      if (current.paymentStatus === "paid") {
        throw new HttpError(409, "A paid order cannot be cancelled through reconciliation");
      }

      const needsRelease = !current.stockReleasedAt;
      setFields.paymentStatus = "cancelled";
      if (needsRelease) {
        setFields.stockReleasedAt = now;
        guards.stockReleasedAt = null;
      }
      history.push({
        at: now,
        actor: actor.role,
        actorId: actor.userId,
        field: "paymentStatus",
        from: current.paymentStatus,
        to: "cancelled",
        reason,
      });
    }

    if (Object.keys(setFields).length > 0) {
      const update: UpdateQuery<IOrder> = {
        $set: setFields as Partial<IOrder>,
        $push: { statusHistory: { $each: history } },
      };
      order = await orderModel.findOneAndUpdate(guards, update, { new: true, session });
      if (!order) {
        throw new HttpError(409, "Order changed while reconciliation was running. Reload and retry.");
      }

      if (setFields.stockReleasedAt instanceof Date && body.resolution === "cancelled") {
        await releaseStock(collectStockRequirements(parseOrderItems(order.items)), session);
      }
    }

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }

  res.status(200).json({ message: "Payment reconciled", data: serializeOrder(order!) });
};

/** POST /v1/order/admin/expire-sweep — releases expired, unpaid card holds. */
export const expireOrdersSweep = async (req: Request, res: Response): Promise<void> => {
  const limit = Math.min(200, Math.max(1, Number(req.body?.limit) || 50));
  const result = await expireStaleOrders(limit);
  res.status(200).json({ message: "Expiry sweep complete", data: result });
};

/** Total paid revenue helper used by reports (kept small and explicit). */
export const sumPaidRevenue = (orders: Pick<IOrder, "paymentStatus" | "totalAmount">[]): number =>
  roundMoney(
    orders.filter((order) => order.paymentStatus === "paid").reduce((sum, order) => sum + order.totalAmount, 0),
  );
