/** Cart business logic (product lines + configured bundle lines, MVP-09).
 *
 * Prices are always resolved from the database through `cart.lines.ts`. A
 * client-supplied price is not part of the request contract. Bundle inventory
 * remains unknown until DEC-01 is resolved, so bundle lines never claim stock.
 */
import { Request, Response } from "express";

import { env } from "../../../config/env.service.js";
import { HttpError } from "../../common/utils/httpError.js";
import { calculateShipping, roundMoney } from "../../common/utils/pricing.js";
import { findVariant, parseVariants } from "../../common/validation/variant.js";
import { bundleModel, IBundleComponent } from "../../database/model/bundle.model.js";
import { cartModel, ICart } from "../../database/model/cart.model.js";
import { productModel } from "../../database/model/product.model.js";

import {
  bundleStockKey,
  evaluateBundleStock,
  resolveBundleLine,
  resolveProductLine,
  ResolvedBundleLine,
  ResolvedProductLine,
  BundleStockView,
} from "./cart.lines.js";

interface AddProductBody {
  itemType?: "product";
  productId: string;
  color?: string;
  size?: string;
  quantity: number;
}

interface AddBundleBody {
  itemType: "bundle";
  bundleId: string;
  hddOption: string;
  installationOption: string;
  quantity: number;
}

const requireUserId = (req: Request): string => {
  const userId = req.user?._id;
  if (!userId) {
    throw new HttpError(401, "Unauthorized");
  }
  return userId;
};

const shippingConfig = () => ({
  type: env.SHIPPING_COST_TYPE,
  value: Number(env.SHIPPING_COST_VALUE) || 0,
});

const lineResponse = (
  item: ICart,
  resolved: ResolvedProductLine | ResolvedBundleLine,
  bundleStock?: BundleStockView,
) => ({
  _id: item._id,
  itemType: item.itemType,
  productId: resolved.itemType === "product" ? resolved.productId : null,
  bundleId: resolved.itemType === "bundle" ? resolved.bundleId : null,
  color: item.color,
  size: item.size,
  hddOption: item.hddOption ?? null,
  installationOption: item.installationOption ?? null,
  quantity: item.quantity,
  unitPrice: resolved.unitPrice,
  lineTotal: resolved.lineTotal,
  available: bundleStock ? bundleStock.available : resolved.available,
  stock: bundleStock ? bundleStock.stock : resolved.stock,
  availabilityUnknown: bundleStock ? false : resolved.availabilityUnknown,
});

interface BundleLike {
  cameras?: IBundleComponent[];
}

/**
 * Loads component variants once for every bundle in the cart and returns
 * `productId|color|size -> stock`. A missing/inactive product is simply absent,
 * which makes the bundle unavailable instead of claiming stock.
 */
const loadBundleStockMap = async (bundles: BundleLike[]): Promise<Map<string, number>> => {
  const stockByKey = new Map<string, number>();
  const ids = new Set<string>();
  for (const bundle of bundles) {
    for (const camera of bundle.cameras ?? []) {
      ids.add(String(camera.productId));
    }
  }
  if (ids.size === 0) {
    return stockByKey;
  }

  const products = await productModel.find({ _id: { $in: Array.from(ids) } }).select("variants isActive");
  const productsById = new Map(products.map((product) => [String(product._id), product]));

  for (const bundle of bundles) {
    for (const camera of bundle.cameras ?? []) {
      const product = productsById.get(String(camera.productId));
      if (!product || !product.isActive) {
        continue;
      }
      const variant = findVariant(parseVariants(product.variants), camera.color, camera.size);
      stockByKey.set(bundleStockKey(String(camera.productId), camera.color, camera.size), variant?.stock ?? 0);
    }
  }

  return stockByKey;
};

/** Adds a product variant line or increases an existing line. */
const addProductToCart = async (userId: string, body: AddProductBody, res: Response): Promise<void> => {
  const product = await productModel.findOne({ _id: body.productId, isActive: true });
  if (!product) {
    throw new HttpError(404, "Product not found or inactive");
  }

  const resolved = resolveProductLine(product, {
    itemType: "product",
    productId: body.productId,
    color: body.color,
    size: body.size,
    quantity: body.quantity,
  });

  const existing = await cartModel.findOne({
    userId,
    itemType: "product",
    productId: product._id,
    color: resolved.variant.color,
    size: resolved.variant.size,
  });

  const requestedTotal = (existing?.quantity ?? 0) + body.quantity;
  if (requestedTotal > resolved.stock) {
    throw new HttpError(
      400,
      `Requested quantity exceeds stock. Available: ${resolved.stock} for ${resolved.variant.color}/${resolved.variant.size}`,
    );
  }

  if (existing) {
    existing.quantity = requestedTotal;
    await existing.save();
    res.status(200).json({ message: "Cart updated", data: lineResponse(existing, resolved) });
    return;
  }

  const cartItem = await cartModel.create({
    userId,
    itemType: "product",
    productId: product._id,
    color: resolved.variant.color,
    size: resolved.variant.size,
    quantity: body.quantity,
  });
  res.status(201).json({ message: "Item added to cart", data: lineResponse(cartItem, resolved) });
};

/** Adds a configured bundle line or increases an existing identical selection. */
const addBundleToCart = async (userId: string, body: AddBundleBody, res: Response): Promise<void> => {
  const bundle = await bundleModel.findOne({ _id: body.bundleId, isActive: true });
  if (!bundle) {
    throw new HttpError(404, "Bundle not found or inactive");
  }

  const resolved = resolveBundleLine(bundle, {
    itemType: "bundle",
    bundleId: body.bundleId,
    hddOption: body.hddOption,
    installationOption: body.installationOption,
    quantity: body.quantity,
  });

  const existing = await cartModel.findOne({
    userId,
    itemType: "bundle",
    bundleId: bundle._id,
    hddOption: resolved.selection.hdd.code,
    installationOption: resolved.selection.installation.code,
  });

  const requestedTotal = (existing?.quantity ?? 0) + body.quantity;
  if (requestedTotal > 1000) {
    throw new HttpError(400, "Requested quantity exceeds the per-line limit");
  }

  // Bundle inventory is the minimum number of complete component kits.
  const stockView = evaluateBundleStock(bundle, requestedTotal, await loadBundleStockMap([bundle]));
  if (!stockView.available) {
    throw new HttpError(
      400,
      `Insufficient component stock for ${bundle.en_name}. Available kits: ${stockView.stock}, requested: ${requestedTotal}`,
    );
  }

  if (existing) {
    existing.quantity = requestedTotal;
    await existing.save();
    res.status(200).json({ message: "Cart updated", data: lineResponse(existing, resolved, stockView) });
    return;
  }

  const cartItem = await cartModel.create({
    userId,
    itemType: "bundle",
    bundleId: bundle._id,
    hddOption: resolved.selection.hdd.code,
    installationOption: resolved.selection.installation.code,
    quantity: body.quantity,
  });
  res.status(201).json({ message: "Item added to cart", data: lineResponse(cartItem, resolved, stockView) });
};

/** Adds an item or increases the quantity of an existing cart line. */
export const addToCart = async (req: Request, res: Response): Promise<void> => {
  const userId = requireUserId(req);
  const body = req.body as AddProductBody | AddBundleBody;

  if (body.itemType === "bundle") {
    await addBundleToCart(userId, body, res);
    return;
  }
  await addProductToCart(userId, body, res);
};

const cartBundleSummary = (bundle: {
  code: string;
  en_name: string;
  ar_name?: string | null;
  fr_name?: string | null;
  basePrice: number;
  discount: number;
  imageURLs?: string[];
}) => ({
  code: bundle.code,
  en_name: bundle.en_name,
  ar_name: bundle.ar_name ?? null,
  fr_name: null,
  basePrice: bundle.basePrice,
  discount: bundle.discount,
  imageURLs: bundle.imageURLs ?? [],
});

/** Returns the cart with per-line availability and totals. */
export const getCart = async (req: Request, res: Response): Promise<void> => {
  const userId = requireUserId(req);

  const items = await cartModel.find({ userId }).populate([
    {
      path: "productId",
      select: "en_name ar_name fr_name price discount variants imageURLs isActive",
    },
    {
      path: "bundleId",
      select:
        "code en_name ar_name fr_name basePrice discount imageURLs hddOptions installationOptions cameras isActive",
    },
  ]);

  const bundleDocs = items
    .filter((item) => item.itemType === "bundle")
    .map((item) => item.bundleId as unknown as BundleLike)
    .filter((bundle): bundle is BundleLike => Boolean(bundle));
  const bundleStockMap = await loadBundleStockMap(bundleDocs);

  let subtotal = 0;
  const lines = items.map((item) => {
    if (item.itemType === "bundle") {
      const bundle = item.bundleId as any;
      if (!bundle || !bundle.isActive) {
        return {
          _id: item._id,
          itemType: "bundle" as const,
          productId: null,
          bundleId: bundle?._id ?? item.bundleId ?? null,
          color: item.color,
          size: item.size,
          hddOption: item.hddOption ?? null,
          installationOption: item.installationOption ?? null,
          quantity: item.quantity,
          bundle: bundle ? cartBundleSummary(bundle) : null,
          hdd: null,
          installation: null,
          available: false,
          availabilityUnknown: true,
          stock: null,
          unitPrice: 0,
          subtotal: 0,
          lineTotal: 0,
        };
      }

      try {
        const resolved = resolveBundleLine(bundle, {
          itemType: "bundle",
          bundleId: String(bundle._id),
          hddOption: item.hddOption ?? "",
          installationOption: item.installationOption ?? "",
          quantity: item.quantity,
        });
        const stockView = evaluateBundleStock(bundle, item.quantity, bundleStockMap);
        if (stockView.available) {
          subtotal += resolved.lineTotal;
        }

        return {
          _id: item._id,
          itemType: "bundle" as const,
          productId: null,
          bundleId: resolved.bundleId,
          color: item.color,
          size: item.size,
          hddOption: resolved.selection.hdd.code,
          installationOption: resolved.selection.installation.code,
          quantity: item.quantity,
          bundle: cartBundleSummary(bundle),
          hdd: resolved.selection.hdd,
          installation: resolved.selection.installation,
          available: stockView.available,
          availabilityUnknown: false,
          stock: stockView.stock,
          unitPrice: stockView.available ? resolved.unitPrice : 0,
          subtotal: stockView.available ? resolved.lineTotal : 0,
          lineTotal: stockView.available ? resolved.lineTotal : 0,
        };
      } catch {
        // A bundle option may have been removed or renamed after it was added.
        return {
          _id: item._id,
          itemType: "bundle" as const,
          productId: null,
          bundleId: bundle._id,
          color: item.color,
          size: item.size,
          hddOption: item.hddOption ?? null,
          installationOption: item.installationOption ?? null,
          quantity: item.quantity,
          bundle: cartBundleSummary(bundle),
          hdd: null,
          installation: null,
          available: false,
          availabilityUnknown: true,
          stock: null,
          unitPrice: 0,
          subtotal: 0,
          lineTotal: 0,
        };
      }
    }

    const product = item.productId as any;
    const available = Boolean(product && product.isActive);

    if (!available) {
      return {
        _id: item._id,
        itemType: "product" as const,
        productId: product?._id ?? item.productId ?? null,
        bundleId: null,
        color: item.color,
        size: item.size,
        hddOption: null,
        installationOption: null,
        quantity: item.quantity,
        product: product ?? null,
        available: false,
        availabilityUnknown: false,
        stock: 0,
        unitPrice: 0,
        subtotal: 0,
        lineTotal: 0,
      };
    }

    try {
      const resolved = resolveProductLine(
        product,
        {
          itemType: "product",
          productId: String(product._id),
          color: item.color,
          size: item.size,
          quantity: item.quantity,
        },
        { enforceStock: false, enforceAvailability: false },
      );

      if (resolved.available) {
        subtotal += resolved.lineTotal;
      }

      return {
        _id: item._id,
        itemType: "product" as const,
        productId: resolved.productId,
        bundleId: null,
        color: resolved.variant.color,
        size: resolved.variant.size,
        hddOption: null,
        installationOption: null,
        quantity: item.quantity,
        product,
        available: resolved.available,
        availabilityUnknown: false,
        stock: resolved.stock,
        unitPrice: resolved.available ? resolved.unitPrice : 0,
        subtotal: resolved.available ? resolved.lineTotal : 0,
        lineTotal: resolved.available ? resolved.lineTotal : 0,
      };
    } catch {
      return {
        _id: item._id,
        itemType: "product" as const,
        productId: product._id,
        bundleId: null,
        color: item.color,
        size: item.size,
        hddOption: null,
        installationOption: null,
        quantity: item.quantity,
        product,
        available: false,
        availabilityUnknown: false,
        stock: 0,
        unitPrice: 0,
        subtotal: 0,
        lineTotal: 0,
      };
    }
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

/** Updates a cart line by its own id, which works for both line types. */
export const updateCartLineQuantity = async (req: Request, res: Response): Promise<void> => {
  const userId = requireUserId(req);
  const lineId = String(req.params.lineId ?? "");
  const { quantity } = req.body;

  const item = await cartModel.findOne({ _id: lineId, userId });
  if (!item) {
    throw new HttpError(404, "Item not found in cart");
  }

  if (item.itemType === "bundle") {
    const bundle = await bundleModel.findOne({ _id: item.bundleId, isActive: true });
    if (!bundle) {
      throw new HttpError(400, "Bundle is no longer available");
    }

    const resolved = resolveBundleLine(bundle, {
      itemType: "bundle",
      bundleId: String(bundle._id),
      hddOption: item.hddOption ?? "",
      installationOption: item.installationOption ?? "",
      quantity,
    });

    const stockView = evaluateBundleStock(bundle, quantity, await loadBundleStockMap([bundle]));
    if (!stockView.available) {
      throw new HttpError(
        400,
        `Insufficient component stock for ${bundle.en_name}. Available kits: ${stockView.stock}, requested: ${quantity}`,
      );
    }

    item.quantity = quantity;
    await item.save();
    res.status(200).json({ message: "Cart updated", data: lineResponse(item, resolved, stockView) });
    return;
  }

  const product = await productModel.findOne({ _id: item.productId, isActive: true });
  if (!product) {
    throw new HttpError(400, "Product is no longer available");
  }

  const resolved = resolveProductLine(
    product,
    {
      itemType: "product",
      productId: String(product._id),
      color: item.color,
      size: item.size,
      quantity,
    },
    { enforceStock: true },
  );

  item.quantity = quantity;
  await item.save();
  res.status(200).json({ message: "Cart updated", data: lineResponse(item, resolved) });
};

/** Updates the quantity of an existing product cart line (legacy route). */
export const updateCartQuantity = async (req: Request, res: Response): Promise<void> => {
  const userId = requireUserId(req);
  const productId = String(req.params.productId ?? "");
  const color = String(req.params.color ?? "");
  const size = String(req.params.size ?? "");
  const { quantity } = req.body;

  const item = await cartModel.findOne({ userId, itemType: "product", productId, color, size });
  if (!item) {
    throw new HttpError(404, "Item not found in cart");
  }

  const product = await productModel.findOne({ _id: productId, isActive: true });
  if (!product) {
    throw new HttpError(400, "Product is no longer available");
  }

  const resolved = resolveProductLine(
    product,
    { itemType: "product", productId, color, size, quantity },
    { enforceStock: true },
  );

  item.quantity = quantity;
  await item.save();
  res.status(200).json({ message: "Cart updated", data: lineResponse(item, resolved) });
};

/** Removes one cart line by line id. */
export const removeCartLine = async (req: Request, res: Response): Promise<void> => {
  const userId = requireUserId(req);
  const lineId = String(req.params.lineId ?? "");

  const item = await cartModel.findOne({ _id: lineId, userId });
  if (!item) {
    throw new HttpError(404, "Item not found in cart");
  }

  await item.deleteOne();
  res.status(200).json({ message: "Item removed from cart" });
};

/** Removes one product cart line (legacy route). */
export const removeCartItem = async (req: Request, res: Response): Promise<void> => {
  const userId = requireUserId(req);
  const productId = String(req.params.productId ?? "");
  const color = String(req.params.color ?? "");
  const size = String(req.params.size ?? "");

  const item = await cartModel.findOne({ userId, itemType: "product", productId, color, size });
  if (!item) {
    throw new HttpError(404, "Item not found in cart");
  }

  await item.deleteOne();
  res.status(200).json({ message: "Item removed from cart" });
};

/** Removes every cart line for the caller. */
export const clearCart = async (req: Request, res: Response): Promise<void> => {
  const userId = requireUserId(req);
  await cartModel.deleteMany({ userId });
  res.status(200).json({ message: "Cart cleared" });
};
