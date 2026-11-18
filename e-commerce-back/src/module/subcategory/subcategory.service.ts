/** Subcategory business logic: CRUD scoped to a parent category. */
import { Request, Response } from "express";
import mongoose from "mongoose";

import { HttpError } from "../../common/utils/httpError.js";
import { toPublicJson } from "../../common/utils/publicSerializer.js";
import { categoryModel } from "../../database/model/category.model.js";
import { productModel } from "../../database/model/product.model.js";
import { subcategoryModel } from "../../database/model/subcategory.model.js";
import { userModel } from "../../database/model/user.model.js";

const SORTABLE_FIELDS = ["en_name", "ar_name", "fr_name", "isActive", "createdAt", "updatedAt", "id", "_id"];

const parseSort = (raw: unknown): Record<string, 1 | -1> => {
  if (typeof raw !== "string" || !raw) {
    return { createdAt: -1 };
  }

  const parts = raw.split("_");
  const direction = parts[parts.length - 1];
  let field = parts.length > 1 ? parts.slice(0, -1).join("_") : "createdAt";
  if (field === "id") {
    field = "_id";
  }

  if (!SORTABLE_FIELDS.includes(field) || (direction !== "asc" && direction !== "desc")) {
    throw new HttpError(400, `sort must be one of ${SORTABLE_FIELDS.join(", ")}_asc|desc`);
  }
  return { [field]: direction === "desc" ? -1 : 1 };
};

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const currentAdminEmail = async (req: Request): Promise<string> => {
  const admin = await userModel.findById(req.user?._id);
  if (!admin?.email) {
    throw new HttpError(404, "Admin not found");
  }
  return admin.email;
};

export const createSubcategory = async (req: Request, res: Response): Promise<void> => {
  const adminEmail = await currentAdminEmail(req);
  const { en_name, ar_name, fr_name, categoryId } = req.body;

  const category = await categoryModel.findById(categoryId);
  if (!category) {
    throw new HttpError(404, "Category not found");
  }

  if (await subcategoryModel.exists({ en_name, categoryId })) {
    throw new HttpError(409, "Subcategory already exists");
  }
  if (ar_name && (await subcategoryModel.exists({ ar_name, categoryId }))) {
    throw new HttpError(409, "Arabic subcategory name already exists");
  }
  if (fr_name && (await subcategoryModel.exists({ fr_name, categoryId }))) {
    throw new HttpError(409, "French subcategory name already exists");
  }

  const subcategory = await subcategoryModel.create({
    en_name,
    ar_name: ar_name || null,
    fr_name: fr_name || null,
    categoryId,
    addedByEmail: adminEmail,
    isActive: true,
  });

  res.status(201).json({ message: "Subcategory created", data: subcategory });
};

export const getActiveSubcategories = async (_req: Request, res: Response): Promise<void> => {
  const subcategories = await subcategoryModel.find({ isActive: true }).populate({
    path: "products",
    match: { isActive: true },
  });
  res.status(200).json({ message: "Subcategories", data: toPublicJson(subcategories) });
};

export const getActiveSubcategoryById = async (req: Request, res: Response): Promise<void> => {
  const subcategory = await subcategoryModel
    .findOne({ _id: req.params.id, isActive: true })
    .populate({ path: "products", match: { isActive: true } });

  if (!subcategory) {
    throw new HttpError(404, "Subcategory not found");
  }
  res.status(200).json({ message: "Subcategory", data: toPublicJson(subcategory) });
};

export const getAllSubcategories = async (req: Request, res: Response): Promise<void> => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
  const order = parseSort(req.query.sort);

  const filter: Record<string, unknown> = {};
  if (typeof req.query.categoryId === "string" && req.query.categoryId) {
    if (!mongoose.isValidObjectId(req.query.categoryId)) {
      throw new HttpError(400, "Invalid category id");
    }
    filter.categoryId = req.query.categoryId;
  }
  if (typeof req.query.en_name === "string" && req.query.en_name) {
    filter.en_name = req.query.en_name;
  }
  if (typeof req.query.q === "string" && req.query.q.trim()) {
    filter.en_name = { $regex: escapeRegex(req.query.q.trim()), $options: "i" };
  }

  const [subcategories, total] = await Promise.all([
    subcategoryModel
      .find(filter)
      .populate({ path: "products" })
      .sort(order)
      .skip((page - 1) * limit)
      .limit(limit),
    subcategoryModel.countDocuments(filter),
  ]);

  res.status(200).json({
    message: "Subcategories",
    data: { subcategories, total, page, limit },
  });
};

export const getSubcategoryById = async (req: Request, res: Response): Promise<void> => {
  const subcategory = await subcategoryModel.findById(req.params.id).populate({ path: "products" });
  if (!subcategory) {
    throw new HttpError(404, "Subcategory not found");
  }
  res.status(200).json({ message: "Subcategory", data: subcategory });
};

export const updateSubcategory = async (req: Request, res: Response): Promise<void> => {
  const subcategory = await subcategoryModel.findById(req.params.id);
  if (!subcategory) {
    throw new HttpError(404, "Subcategory not found");
  }

  const { en_name, ar_name, fr_name, categoryId, isActive } = req.body;
  const targetCategoryId = categoryId ?? subcategory.categoryId;

  if (en_name !== undefined && en_name !== subcategory.en_name) {
    if (
      await subcategoryModel.exists({
        en_name,
        categoryId: targetCategoryId,
        _id: { $ne: subcategory._id },
      })
    ) {
      throw new HttpError(409, "Subcategory name already exists");
    }
    subcategory.en_name = en_name;
  }

  if (ar_name !== undefined) {
    if (
      ar_name &&
      (await subcategoryModel.exists({
        ar_name,
        categoryId: targetCategoryId,
        _id: { $ne: subcategory._id },
      }))
    ) {
      throw new HttpError(409, "Arabic subcategory name already exists");
    }
    subcategory.ar_name = ar_name || null;
  }

  if (fr_name !== undefined) {
    if (
      fr_name &&
      (await subcategoryModel.exists({
        fr_name,
        categoryId: targetCategoryId,
        _id: { $ne: subcategory._id },
      }))
    ) {
      throw new HttpError(409, "French subcategory name already exists");
    }
    subcategory.fr_name = fr_name || null;
  }

  if (categoryId !== undefined && String(categoryId) !== String(subcategory.categoryId)) {
    const category = await categoryModel.findById(categoryId);
    if (!category) {
      throw new HttpError(404, "Category not found");
    }
    subcategory.categoryId = categoryId;
  }

  if (isActive !== undefined && isActive !== subcategory.isActive) {
    subcategory.isActive = isActive;
    await productModel.updateMany({ subcategoryId: subcategory._id }, { isActive });
  }

  await subcategory.save();
  res.status(200).json({ message: "Subcategory updated", data: subcategory });
};

export const softDeleteSubcategory = async (req: Request, res: Response): Promise<void> => {
  const subcategory = await subcategoryModel.findById(req.params.id);
  if (!subcategory) {
    throw new HttpError(404, "Subcategory not found");
  }

  await productModel.updateMany({ subcategoryId: subcategory._id }, { isActive: false });
  subcategory.isActive = false;
  await subcategory.save();

  res.status(200).json({ message: "Subcategory soft deleted" });
};
