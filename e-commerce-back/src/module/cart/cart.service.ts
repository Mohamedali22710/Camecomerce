/** Cart business logic: CRUD with variant stock validation and pricing. */
import { Request, Response } from "express";

import { env } from "../../../config/env.service.js";
import { HttpError } from "../../common/utils/httpError.js";
import {
  calculateShipping,
  discountedUnitPrice,
  roundMoney,
} from "../../common/utils/pricing.js";
import { findVariant, parseVariants } from "../../common/validation/variant.js";
import { cartModel } from "../../database/model/cart.model.js";
import { productModel } from "../../database/model/product.model.js";

const requireUserId = (req: Request): string => {
  const userId = req.user?._id;
  if (!userId) {throw new HttpError(401, "Unauthorized");}
  return userId;
};

const shippingConfig = () => ({
  type: env.SHIPPING_COST_TYPE,
  value: Number(env.SHIPPING_COST_VALUE) || 0,
});

/** Adds an item or increases the quantity of an existing cart line. */
export const addToCart = async (req: Request, res: Response): Promise<void> => {
  const userId = requireUserId(req);
  const { productId, quantity } = req.body;

  const product = await productModel.findOne({ _id: productId, isActive: true });
  if (!product) {throw new HttpError(404, "Product not found or inactive");}

  const variants = parseVariants(product.variants);
  const variant = findVariant(variants, req.body.color, req.body.size);
  if (!variant) {
    throw new HttpError(
      400,
      `Variant ${req.body.color || "Default"}/${req.body.size || "Default"} not found for this product`,
    );
  }

  const existing = await cartModel.findOne({
    userId,
    productId,
    color: variant.color,
    size: variant.size,
  });

  const requestedTotal = (existing?.quantity ?? 0) + quantity;
  if (requestedTotal > variant.stock) {
    throw new HttpError(
      400,
      `Requested quantity exceeds stock. Available: ${variant.stock} for ${variant.color}/${variant.size}`,
    );
  }

  if (existing) {
    existing.quantity = requestedTotal;
    await existing.save();
    res.status(200).json({ message: "Cart updated", data: existing });
    return;
  }

  const cartItem = await cartModel.create({
    userId,
    productId,
    color: variant.color,
    size: variant.size,
    quantity,
  });
  res.status(201).json({ message: "Item added to cart", data: cartItem });
};

/** Returns the cart with per-line availability and totals. */
export const getCart = async (req: Request, res: Response): Promise<void> => {
  const userId = requireUserId(req);

  const items = await cartModel.find({ userId }).populate({
    path: "productId",
    select: "en_name ar_name fr_name price discount variants imageURLs isActive",
  });

  let subtotal = 0;
  const lines = items.map((item) => {
    const product = item.productId as any;
    const available = Boolean(product && product.isActive);
    const variant = available
      ? findVariant(parseVariants(product.variants), item.color, item.size)
      : undefined;
    const inStock = Boolean(variant && variant.stock >= item.quantity);

    let lineTotal = 0;
    if (available && inStock) {
      const unitPrice = discountedUnitPrice(product.price, product.discount);
      lineTotal = roundMoney(unitPrice * item.quantity);
      subtotal += lineTotal;
    }

    return {
      _id: item._id,
      productId: product?._id ?? null,
      color: item.color,
      size: item.size,
      quantity: item.quantity,
      product,
      available: available && inStock,
      stock: variant?.stock ?? 0,
      unitPrice: available ? discountedUnitPrice(product.price, product.discount) : 0,
      subtotal: lineTotal,
    };
  });

  subtotal = roundMoney(subtotal);
  const shippingCost = calculateShipping(subtotal, shippingConfig());

  res.status(200).json({
    message: "Cart",
    data: {
      items: lines,
      subtotal,
      shippingCost,
      total: roundMoney(subtotal + shippingCost),
      currency: env.CURRENCY,
    },
  });
};

/** Updates the quantity of an existing cart line. */
export const updateCartQuantity = async (req: Request, res: Response): Promise<void> => {
  const userId = requireUserId(req);
  const productId = String(req.params.productId ?? "");
  const color = String(req.params.color ?? "");
  const size = String(req.params.size ?? "");
  const { quantity } = req.body;

  const item = await cartModel.findOne({ userId, productId, color, size });
  if (!item) {throw new HttpError(404, "Item not found in cart");}

  const product = await productModel.findById(productId);
  if (!product || !product.isActive) {
    throw new HttpError(400, "Product is no longer available");
  }

  const variant = findVariant(parseVariants(product.variants), color, size);
  if (!variant) {
    throw new HttpError(400, `Variant ${color}/${size} no longer exists`);
  }
  if (quantity > variant.stock) {
    throw new HttpError(
      400,
      `Requested quantity exceeds stock (${variant.stock} available for ${variant.color}/${variant.size})`,
    );
  }

  item.quantity = quantity;
  await item.save();
  res.status(200).json({ message: "Cart updated", data: item });
};

/** Removes one cart line. */
export const removeCartItem = async (req: Request, res: Response): Promise<void> => {
  const userId = requireUserId(req);
  const productId = String(req.params.productId ?? "");
  const color = String(req.params.color ?? "");
  const size = String(req.params.size ?? "");

  const item = await cartModel.findOne({ userId, productId, color, size });
  if (!item) {throw new HttpError(404, "Item not found in cart");}

  await item.deleteOne();
  res.status(200).json({ message: "Item removed from cart" });
};

/** Removes every cart line for the caller. */
export const clearCart = async (req: Request, res: Response): Promise<void> => {
  const userId = requireUserId(req);
  await cartModel.deleteMany({ userId });
  res.status(200).json({ message: "Cart cleared" });
};
