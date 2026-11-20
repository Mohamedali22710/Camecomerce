/** Bundle business logic (MVP-06, MVP-07).
 *
 * Admin CRUD and public reads use the same pricing function as the cart and order
 * paths. A bundle has no stock counter of its own: cart availability is derived
 * from the component variants, and checkout reserves those components.
 */
import { Request, Response } from "express";
import { Types } from "mongoose";

import { env } from "../../../config/env.service.js";
import { buildQuery } from "../../common/utils/buildQuery.js";
import { currentAdminEmail } from "../../common/utils/currentAdmin.js";
import { HttpError } from "../../common/utils/httpError.js";
import {
  IBundle,
  IBundleComponent,
  IBundleHddOption,
  IBundleInstallationOption,
  bundleModel,
} from "../../database/model/bundle.model.js";
import { IProduct, productModel } from "../../database/model/product.model.js";

import { discountedBundleBasePrice } from "./bundle.pricing.js";

interface BundleInputBody {
  code: string;
  en_name: string;
  ar_name?: string | null;
  description?: string | null;
  imageURLs?: string[];
  basePrice: number;
  discount?: number;
  cameras: {
    productId: string;
    color: string;
    size: string;
    quantity: number;
  }[];
  hddOptions: IBundleHddOption[];
  installationOptions: IBundleInstallationOption[];
  isActive?: boolean;
}

export interface BundleComponentWarning {
  index: number;
  productId: string;
  message: string;
}

/** Public filter: inactive bundles are never returned to the storefront. */
export const ACTIVE_BUNDLE_WHERE = { isActive: true } as const;

const loadProductsById = async (cameras: { productId: unknown }[]): Promise<Map<string, IProduct>> => {
  const ids = [...new Set(cameras.map((camera) => String(camera.productId)))];
  if (ids.length === 0) {
    return new Map();
  }

  const products = await productModel.find({ _id: { $in: ids } });
  return new Map(products.map((product) => [String(product._id), product]));
};

/**
 * Rejects a component that references a missing product. The error names the
 * component index so an admin can fix the exact row.
 */
export const assertComponentIndexesExist = (
  cameras: { productId: unknown }[],
  existingProductIds: Set<string>,
): void => {
  cameras.forEach((camera, index) => {
    if (!existingProductIds.has(String(camera.productId))) {
      throw new HttpError(404, `Bundle component at index ${index} references a product that does not exist`);
    }
  });
};

/** Inactive components are allowed but reported to the admin in the response. */
export const buildComponentWarnings = (
  cameras: { productId: unknown }[],
  productsById: Map<string, IProduct>,
): BundleComponentWarning[] =>
  cameras.flatMap((camera, index) => {
    const product = productsById.get(String(camera.productId));
    if (product?.isActive) {
      return [];
    }
    return [
      {
        index,
        productId: String(camera.productId),
        message: `Component at index ${index} references an inactive product`,
      },
    ];
  });

const toComponents = (cameras: BundleInputBody["cameras"]): IBundleComponent[] =>
  cameras.map((camera) => ({
    productId: new Types.ObjectId(camera.productId),
    color: camera.color,
    size: camera.size,
    quantity: camera.quantity,
  }));

const serializeBundleAdmin = (bundle: IBundle) => ({
  ...bundle.toJSON(),
  currency: env.CURRENCY,
});

const buildBundleDocument = (body: BundleInputBody, adminEmail: string) => ({
  code: body.code,
  en_name: body.en_name,
  ar_name: body.ar_name ?? null,
  description: body.description ?? null,
  imageURLs: body.imageURLs ?? [],
  basePrice: Number(body.basePrice),
  discount: body.discount !== undefined ? Number(body.discount) : 0,
  cameras: toComponents(body.cameras),
  hddOptions: body.hddOptions,
  installationOptions: body.installationOptions,
  addedByEmail: adminEmail,
  isActive: body.isActive ?? true,
});

const applyBundleUpdates = (bundle: IBundle, body: Partial<BundleInputBody>): void => {
  if (body.code !== undefined) {
    bundle.code = body.code;
  }
  if (body.en_name !== undefined) {
    bundle.en_name = body.en_name;
  }
  if (body.ar_name !== undefined) {
    bundle.ar_name = body.ar_name ?? null;
  }
  if (body.description !== undefined) {
    bundle.description = body.description ?? null;
  }
  if (body.imageURLs !== undefined) {
    bundle.imageURLs = body.imageURLs;
  }
  if (body.basePrice !== undefined) {
    bundle.basePrice = Number(body.basePrice);
  }
  if (body.discount !== undefined) {
    bundle.discount = Number(body.discount);
  }
  if (body.hddOptions !== undefined) {
    bundle.hddOptions = body.hddOptions;
  }
  if (body.installationOptions !== undefined) {
    bundle.installationOptions = body.installationOptions;
  }
  if (body.isActive !== undefined) {
    bundle.isActive = body.isActive;
  }
};

/** Creates a bundle after validating every component product exists. */
export const createBundle = async (req: Request, res: Response): Promise<void> => {
  const adminEmail = await currentAdminEmail(req);
  const body = req.body as BundleInputBody;

  const productsById = await loadProductsById(body.cameras);
  assertComponentIndexesExist(body.cameras, new Set(productsById.keys()));

  const bundle = await bundleModel.create(buildBundleDocument(body, adminEmail));

  res.status(201).json({
    message: "Bundle created",
    data: serializeBundleAdmin(bundle),
    warnings: buildComponentWarnings(body.cameras, productsById),
  });
};

/** Updates bundle fields, re-validating components when they change. */
export const updateBundle = async (req: Request, res: Response): Promise<void> => {
  const bundle = await bundleModel.findById(req.params.id);
  if (!bundle) {
    throw new HttpError(404, "Bundle not found");
  }

  const body = req.body as Partial<BundleInputBody>;
  let productsById = await loadProductsById(bundle.cameras);

  if (body.cameras !== undefined) {
    productsById = await loadProductsById(body.cameras);
    assertComponentIndexesExist(body.cameras, new Set(productsById.keys()));
    bundle.cameras = toComponents(body.cameras);
  }

  applyBundleUpdates(bundle, body);
  await bundle.save();

  res.status(200).json({
    message: "Bundle updated",
    data: serializeBundleAdmin(bundle),
    warnings: buildComponentWarnings(bundle.cameras, productsById),
  });
};

/** Admin listing including inactive bundles. */
export const getAllBundles = async (req: Request, res: Response): Promise<void> => {
  const { where, order, offset, limit, page } = buildQuery({
    reqQuery: req.query,
    priceField: "basePrice",
    allowedSortFields: ["basePrice", "en_name", "ar_name", "code", "createdAt"],
    searchFields: ["en_name", "ar_name", "code"],
  });

  const [bundles, total] = await Promise.all([
    bundleModel.find(where).sort(order).skip(offset).limit(limit),
    bundleModel.countDocuments(where),
  ]);

  res.status(200).json({
    message: "Bundles",
    data: {
      bundles: bundles.map(serializeBundleAdmin),
      total,
      page,
      limit,
      currency: env.CURRENCY,
    },
  });
};

/** Admin lookup by id, including inactive bundles. */
export const getBundleById = async (req: Request, res: Response): Promise<void> => {
  const bundle = await bundleModel.findById(req.params.id);
  if (!bundle) {
    throw new HttpError(404, "Bundle not found");
  }
  res.status(200).json({ message: "Bundle", data: serializeBundleAdmin(bundle) });
};

/** Soft-deletes a bundle by deactivating it. */
export const softDeleteBundle = async (req: Request, res: Response): Promise<void> => {
  const bundle = await bundleModel.findById(req.params.id);
  if (!bundle) {
    throw new HttpError(404, "Bundle not found");
  }

  bundle.isActive = false;
  await bundle.save();
  res.status(200).json({ message: "Bundle soft deleted" });
};

const buildComponentSummaries = (cameras: IBundleComponent[], productsById: Map<string, IProduct>) =>
  cameras.map((camera) => {
    const product = productsById.get(String(camera.productId));
    return {
      productId: String(camera.productId),
      color: camera.color,
      size: camera.size,
      quantity: camera.quantity,
      en_name: product?.en_name ?? null,
      ar_name: product?.ar_name ?? null,
      isActive: product?.isActive ?? null,
    };
  });

/**
 * Public projection. Removes admin-only fields and adds the computed
 * discounted base price. Availability is intentionally omitted until DEC-01 is
 * resolved, so no false stock claim is made.
 */
export const serializePublicBundle = (
  bundle: IBundle,
  productsById: Map<string, IProduct>,
): Record<string, unknown> => {
  const raw = bundle.toJSON() as Record<string, unknown>;
  delete raw.addedByEmail;
  delete raw.__v;

  return {
    ...raw,
    finalPrice: discountedBundleBasePrice(bundle),
    currency: env.CURRENCY,
    cameras: buildComponentSummaries(bundle.cameras, productsById),
  };
};

/** Public listing: active bundles only, paginated, newest first by default. */
export const getActiveBundles = async (req: Request, res: Response): Promise<void> => {
  const { where, order, offset, limit, page } = buildQuery({
    reqQuery: req.query,
    priceField: "basePrice",
    allowedSortFields: ["basePrice", "en_name", "ar_name", "createdAt"],
    searchFields: ["en_name", "ar_name", "code"],
    extraWhere: ACTIVE_BUNDLE_WHERE,
  });

  const [bundles, total] = await Promise.all([
    bundleModel.find(where).sort(order).skip(offset).limit(limit),
    bundleModel.countDocuments(where),
  ]);

  const productsById = await loadProductsById(bundles.flatMap((bundle) => bundle.cameras));

  res.status(200).json({
    message: "Bundles",
    data: {
      bundles: bundles.map((bundle) => serializePublicBundle(bundle, productsById)),
      total,
      page,
      limit,
      currency: env.CURRENCY,
    },
  });
};

/** Public detail: active bundle only; inactive returns 404. */
export const getActiveBundleById = async (req: Request, res: Response): Promise<void> => {
  const bundle = await bundleModel.findOne({
    _id: req.params.id,
    ...ACTIVE_BUNDLE_WHERE,
  });
  if (!bundle) {
    throw new HttpError(404, "Bundle not found");
  }

  const productsById = await loadProductsById(bundle.cameras);
  res.status(200).json({
    message: "Bundle",
    data: serializePublicBundle(bundle, productsById),
  });
};
