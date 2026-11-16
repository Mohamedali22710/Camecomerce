/** Product business logic: CRUD, multi-image upload, and variant/stock management.
 *
 * Variants are stored as a JSON string (existing schema) but exposed through the
 * API as a normalized array. "size" is a free-form label so both CCTV cameras
 * and accessories (for example color "White", size "2TB") are supported.
 */
import { Request, Response } from "express";
import mongoose from "mongoose";

import { env } from "../../../config/env.service.js";
import { buildQuery } from "../../common/utils/buildQuery.js";
import { currentAdminEmail } from "../../common/utils/currentAdmin.js";
import { HttpError } from "../../common/utils/httpError.js";
import {
  deleteImagesByUrls,
  uploadBase64Image,
  uploadImages,
} from "../../common/utils/uploadImage.js";
import {
  normalizeSpecificationsInput,
  parseSpecifications,
  serializeSpecifications,
} from "../../common/validation/specification.js";
import {
  ProductVariant,
  normalizeVariant,
  parseVariants,
} from "../../common/validation/variant.js";
import {
  IProduct,
  productModel,
} from "../../database/model/product.model.js";
import { subcategoryModel } from "../../database/model/subcategory.model.js";

interface ColorImageInput {
  color: string;
  imageURL?: string;
}

const parseJsonArray = (raw: string | null | undefined): string[] => {
  if (!raw) {return [];}
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
};

const parseJsonObject = (raw: string | null | undefined): Record<string, string> => {
  if (!raw) {return {};}
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

/** Normalizes variant input coming from JSON or multipart form fields. */
const normalizeVariantsInput = (raw: unknown): ProductVariant[] => {
  let value = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(value)) {return [];}
  return value
    .filter((item): item is Partial<ProductVariant> => Boolean(item) && typeof item === "object")
    .map(normalizeVariant);
};

const normalizeColorImagesInput = (raw: unknown): ColorImageInput[] => {
  let value = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return [];
    }
  }
  return Array.isArray(value) ? (value as ColorImageInput[]) : [];
};

/** Trims an optional brand and stores blank input as `null`. */
const normalizeBrand = (raw: unknown): string | null => {
  if (typeof raw !== "string") {return null;}
  const trimmed = raw.trim();
  return trimmed ? trimmed : null;
};

/** Uploads data-URI images and keeps already-hosted URLs unchanged. */
const buildColorImages = async (
  raw: unknown,
): Promise<Record<string, string>> => {
  const result: Record<string, string> = {};
  for (const entry of normalizeColorImagesInput(raw)) {
    if (!entry?.imageURL) {continue;}
    const color = String(entry.color ?? "").trim();
    if (!color) {continue;}

    if (!entry.imageURL.startsWith("data:image/")) {
      result[color] = entry.imageURL;
      continue;
    }

    try {
      const uploaded = await uploadBase64Image(entry.imageURL, "products");
      result[color] = uploaded.url;
    } catch (error: any) {
      throw new HttpError(400, `Invalid image for color ${color}: ${error?.message}`);
    }
  }
  return result;
};

/** Public API representation of a product. */
const serializeProduct = (product: IProduct) => ({
  ...product.toJSON(),
  brand: product.brand ?? null,
  variants: parseVariants(product.variants),
  specifications: parseSpecifications(product.specifications),
  imageURLs: parseJsonArray(product.imageURLs),
  colorImages: parseJsonObject(product.colorImages),
  currency: env.CURRENCY,
});

/** Creates a product. */
export const createProduct = async (req: Request, res: Response): Promise<void> => {
  const adminEmail = await currentAdminEmail(req);
  const {
    en_name,
    ar_name,
    fr_name,
    en_description,
    ar_description,
    fr_description,
    price,
    discount,
    brand,
    subcategoryId,
  } = req.body;

  const subcategory = await subcategoryModel.findById(subcategoryId);
  if (!subcategory) {throw new HttpError(404, "Subcategory not found");}

  const variants = normalizeVariantsInput(req.body.variants);
  if (variants.length === 0) {
    throw new HttpError(400, "At least one product variant is required");
  }

  const specifications = normalizeSpecificationsInput(req.body.specifications);

  let imageURLs: string | null = null;
  const files = req.files as Express.Multer.File[] | undefined;
  if (files && files.length > 0) {
    try {
      const results = await uploadImages(files, "products");
      imageURLs = JSON.stringify(results.map((result) => result.url));
    } catch (error: any) {
      throw new HttpError(400, error?.message || "Image upload failed");
    }
  }

  const colorImages = await buildColorImages(req.body.colorImages);

  const product = await productModel.create({
    en_name,
    ar_name: ar_name || null,
    fr_name: fr_name || null,
    en_description,
    ar_description: ar_description || null,
    fr_description: fr_description || null,
    price: Number(price),
    discount: discount !== undefined ? Number(discount) : 0,
    brand: normalizeBrand(brand),
    imageURLs,
    colorImages: Object.keys(colorImages).length > 0 ? JSON.stringify(colorImages) : null,
    specifications: serializeSpecifications(specifications),
    variants: JSON.stringify(variants),
    subcategoryId,
    addedByEmail: adminEmail,
    isActive: true,
  });

  res.status(201).json({ message: "Product created", data: serializeProduct(product) });
};

/** Updates a product. */
export const updateProduct = async (req: Request, res: Response): Promise<void> => {
  const product = await productModel.findById(req.params.id);
  if (!product) {throw new HttpError(404, "Product not found");}

  const {
    en_name,
    ar_name,
    fr_name,
    en_description,
    ar_description,
    fr_description,
    price,
    discount,
    brand,
    subcategoryId,
    imageURLs,
    isActive,
  } = req.body;

  if (en_name !== undefined) {product.en_name = en_name;}
  if (ar_name !== undefined) {product.ar_name = ar_name || null;}
  if (fr_name !== undefined) {product.fr_name = fr_name || null;}
  if (en_description !== undefined) {product.en_description = en_description;}
  if (ar_description !== undefined) {product.ar_description = ar_description || null;}
  if (fr_description !== undefined) {product.fr_description = fr_description || null;}
  if (price !== undefined) {product.price = Number(price);}
  if (discount !== undefined) {product.discount = Number(discount);}
  if (brand !== undefined) {product.brand = normalizeBrand(brand);}
  if (isActive !== undefined) {product.isActive = isActive;}

  if (req.body.specifications !== undefined) {
    product.specifications = serializeSpecifications(
      normalizeSpecificationsInput(req.body.specifications),
    );
  }

  if (req.body.variants !== undefined) {
    const variants = normalizeVariantsInput(req.body.variants);
    if (variants.length === 0) {
      throw new HttpError(400, "At least one product variant is required");
    }
    product.variants = JSON.stringify(variants);
  }

  if (req.body.colorImages !== undefined) {
    const colorImages = await buildColorImages(req.body.colorImages);
    product.colorImages =
      Object.keys(colorImages).length > 0 ? JSON.stringify(colorImages) : null;
  }

  if (subcategoryId !== undefined) {
    const subcategory = await subcategoryModel.findById(subcategoryId);
    if (!subcategory) {throw new HttpError(404, "Subcategory not found");}
    product.subcategoryId = subcategoryId;
  }

  const files = req.files as Express.Multer.File[] | undefined;
  if (files && files.length > 0) {
    try {
      if (product.imageURLs) {
        await deleteImagesByUrls(parseJsonArray(product.imageURLs), "products");
      }
      const results = await uploadImages(files, "products");
      product.imageURLs = JSON.stringify(results.map((result) => result.url));
    } catch (error: any) {
      throw new HttpError(400, error?.message || "Image upload failed");
    }
  } else if (imageURLs !== undefined) {
    product.imageURLs = imageURLs || null;
  }

  await product.save();
  res.status(200).json({ message: "Product updated", data: serializeProduct(product) });
};

const paginated = async (baseWhere: Record<string, unknown>, req: Request) => {
  const { where, order, offset, limit, page } = buildQuery({
    reqQuery: req.query,
    extraWhere: baseWhere,
  });
  const [products, total] = await Promise.all([
    productModel.find(where).sort(order).skip(offset).limit(limit),
    productModel.countDocuments(where),
  ]);
  return {
    products: products.map(serializeProduct),
    total,
    page,
    limit,
    currency: env.CURRENCY,
  };
};

/** Admin listing (includes inactive products). */
export const getAllProducts = async (req: Request, res: Response): Promise<void> => {
  res.status(200).json({ message: "Products", data: await paginated({}, req) });
};

/** Public listing (active products only). */
export const getActiveProducts = async (req: Request, res: Response): Promise<void> => {
  res
    .status(200)
    .json({ message: "Products", data: await paginated({ isActive: true }, req) });
};

/** Admin lookup by id. */
export const getProductById = async (req: Request, res: Response): Promise<void> => {
  const product = await productModel.findById(req.params.id);
  if (!product) {throw new HttpError(404, "Product not found");}
  res.status(200).json({ message: "Product", data: serializeProduct(product) });
};

/** Public lookup by id (active only). */
export const getActiveProductById = async (req: Request, res: Response): Promise<void> => {
  const product = await productModel.findOne({ _id: req.params.id, isActive: true });
  if (!product) {throw new HttpError(404, "Product not found");}
  res.status(200).json({ message: "Product", data: serializeProduct(product) });
};

/** Public listing filtered by category (through its active subcategories). */
export const getProductsByCategory = async (req: Request, res: Response): Promise<void> => {
  const categoryId = req.params.categoryId;
  if (!mongoose.isValidObjectId(categoryId)) {
    throw new HttpError(400, "Invalid category id");
  }

  const subcategories = await subcategoryModel.find({ categoryId, isActive: true });
  const subcategoryIds = subcategories.map((subcategory) => subcategory._id);

  res.status(200).json({
    message: "Products",
    data: await paginated({ isActive: true, subcategoryId: { $in: subcategoryIds } }, req),
  });
};

/** Public listing filtered by subcategory. */
export const getProductsBySubcategory = async (req: Request, res: Response): Promise<void> => {
  const subcategoryId = req.params.subcategoryId;
  if (!mongoose.isValidObjectId(subcategoryId)) {
    throw new HttpError(400, "Invalid subcategory id");
  }

  res.status(200).json({
    message: "Products",
    data: await paginated({ isActive: true, subcategoryId }, req),
  });
};

/** Soft deletes a product. */
export const softDeleteProduct = async (req: Request, res: Response): Promise<void> => {
  const product = await productModel.findById(req.params.id);
  if (!product) {throw new HttpError(404, "Product not found");}

  product.isActive = false;
  await product.save();
  res.status(200).json({ message: "Product soft deleted" });
};
