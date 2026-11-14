/** Category business logic: CRUD with configurable image upload (Cloudinary or local disk). */
import { Request, Response } from "express";

import { HttpError } from "../../common/utils/httpError.js";
import {
  deleteImageByUrl,
  uploadImage,
} from "../../common/utils/uploadImage.js";
import { categoryModel } from "../../database/model/category.model.js";
import { productModel } from "../../database/model/product.model.js";
import { subcategoryModel } from "../../database/model/subcategory.model.js";
import { userModel } from "../../database/model/user.model.js";

const SORTABLE_FIELDS = ["en_name", "ar_name", "fr_name", "isActive", "createdAt", "updatedAt"];

/** Parses `field_asc|desc` while restricting the field to a known allow-list. */
const parseSort = (raw: unknown): Record<string, 1 | -1> => {
  if (typeof raw !== "string" || !raw) {return { createdAt: -1 };}

  const parts = raw.split("_");
  const direction = parts[parts.length - 1];
  const field = parts.length > 1 ? parts.slice(0, -1).join("_") : "createdAt";

  if (!SORTABLE_FIELDS.includes(field) || (direction !== "asc" && direction !== "desc")) {
    throw new HttpError(400, `sort must be one of ${SORTABLE_FIELDS.join(", ")}_asc|desc`);
  }
  return { [field]: direction === "desc" ? -1 : 1 };
};

const parsePagination = (query: Request["query"]): { page: number; limit: number } => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  return { page, limit };
};

const currentAdminEmail = async (req: Request): Promise<string> => {
  const admin = await userModel.findById(req.user?._id);
  if (!admin?.email) {throw new HttpError(404, "Admin not found");}
  return admin.email;
};

export const createCategory = async (req: Request, res: Response): Promise<void> => {
  const adminEmail = await currentAdminEmail(req);
  const { en_name, ar_name, fr_name } = req.body;

  if (await categoryModel.exists({ en_name })) {
    throw new HttpError(409, "Category already exists");
  }
  if (ar_name && (await categoryModel.exists({ ar_name }))) {
    throw new HttpError(409, "Arabic category name already exists");
  }
  if (fr_name && (await categoryModel.exists({ fr_name }))) {
    throw new HttpError(409, "French category name already exists");
  }

  let imageURL: string | null = null;
  if (req.file) {
    try {
      const result = await uploadImage(req.file, "categories");
      imageURL = result.url;
    } catch (error: any) {
      throw new HttpError(400, error?.message || "Image upload failed");
    }
  }

  const category = await categoryModel.create({
    en_name,
    ar_name: ar_name || null,
    fr_name: fr_name || null,
    imageURL,
    addedByEmail: adminEmail,
    isActive: true,
  });

  res.status(201).json({ message: "Category created", data: category });
};

export const getAllCategories = async (req: Request, res: Response): Promise<void> => {
  const { page, limit } = parsePagination(req.query);
  const order = parseSort(req.query.sort);

  const [categories, total] = await Promise.all([
    categoryModel
      .find()
      .populate({ path: "subcategories", populate: { path: "products" } })
      .sort(order)
      .skip((page - 1) * limit)
      .limit(limit),
    categoryModel.countDocuments(),
  ]);

  res.status(200).json({ message: "Categories", data: { categories, total, page, limit } });
};

export const getActiveCategories = async (_req: Request, res: Response): Promise<void> => {
  const categories = await categoryModel.find({ isActive: true }).populate({
    path: "subcategories",
    match: { isActive: true },
    populate: { path: "products", match: { isActive: true } },
  });
  res.status(200).json({ message: "Categories", data: categories });
};

export const getSubcategoriesByCategory = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const category = await categoryModel.findById(req.params.id);
  if (!category || !category.isActive) {throw new HttpError(404, "Category not found");}

  const subcategories = await subcategoryModel
    .find({ categoryId: category._id, isActive: true })
    .populate({ path: "products", match: { isActive: true } });

  res.status(200).json({ message: "Subcategories", data: subcategories });
};

export const getCategoryById = async (req: Request, res: Response): Promise<void> => {
  const category = await categoryModel.findById(req.params.id).populate({
    path: "subcategories",
    populate: { path: "products" },
  });
  if (!category) {throw new HttpError(404, "Category not found");}
  res.status(200).json({ message: "Category", data: category });
};

export const updateCategory = async (req: Request, res: Response): Promise<void> => {
  const category = await categoryModel.findById(req.params.id);
  if (!category) {throw new HttpError(404, "Category not found");}

  const { en_name, ar_name, fr_name, imageURL } = req.body;

  if (en_name !== undefined && en_name !== category.en_name) {
    if (await categoryModel.exists({ en_name, _id: { $ne: category._id } })) {
      throw new HttpError(409, "Category name already exists");
    }
    category.en_name = en_name;
  }

  if (ar_name !== undefined) {
    if (ar_name && (await categoryModel.exists({ ar_name, _id: { $ne: category._id } }))) {
      throw new HttpError(409, "Arabic category name already exists");
    }
    category.ar_name = ar_name || null;
  }

  if (fr_name !== undefined) {
    if (fr_name && (await categoryModel.exists({ fr_name, _id: { $ne: category._id } }))) {
      throw new HttpError(409, "French category name already exists");
    }
    category.fr_name = fr_name || null;
  }

  if (req.file) {
    try {
      if (category.imageURL) {await deleteImageByUrl(category.imageURL, "categories");}
      const result = await uploadImage(req.file, "categories");
      category.imageURL = result.url;
    } catch (error: any) {
      throw new HttpError(400, error?.message || "Image upload failed");
    }
  } else if (imageURL !== undefined) {
    category.imageURL = imageURL || null;
  }

  await category.save();
  res.status(200).json({ message: "Category updated", data: category });
};

export const softDeleteCategory = async (req: Request, res: Response): Promise<void> => {
  const category = await categoryModel.findById(req.params.id);
  if (!category) {throw new HttpError(404, "Category not found");}

  const subcategories = await subcategoryModel.find({ categoryId: category._id });
  const subcategoryIds = subcategories.map((subcategory) => subcategory._id);

  if (subcategoryIds.length > 0) {
    await productModel.updateMany(
      { subcategoryId: { $in: subcategoryIds } },
      { isActive: false },
    );
    await subcategoryModel.updateMany(
      { _id: { $in: subcategoryIds } },
      { isActive: false },
    );
  }

  category.isActive = false;
  await category.save();

  res.status(200).json({ message: "Category soft deleted" });
};
