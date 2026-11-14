/** Wishlist business logic: add, list, and remove products. */
import { Request, Response } from "express";

import { HttpError } from "../../common/utils/httpError.js";
import { productModel } from "../../database/model/product.model.js";
import { wishlistModel } from "../../database/model/wishlist.model.js";

const requireUserId = (req: Request): string => {
  const userId = req.user?._id;
  if (!userId) {throw new HttpError(401, "Unauthorized");}
  return userId;
};

export const addToWishlist = async (req: Request, res: Response): Promise<void> => {
  const userId = requireUserId(req);
  const productId = String(req.params.productId ?? "");

  const product = await productModel.findOne({ _id: productId, isActive: true });
  if (!product) {throw new HttpError(404, "Product not found or inactive");}

  if (await wishlistModel.exists({ userId, productId })) {
    throw new HttpError(409, "Product already in wishlist");
  }

  const item = await wishlistModel.create({ userId, productId });
  res.status(201).json({ message: "Added to wishlist", data: item });
};

export const getWishlist = async (req: Request, res: Response): Promise<void> => {
  const userId = requireUserId(req);
  const items = await wishlistModel.find({ userId }).populate({
    path: "productId",
    select: "_id en_name ar_name fr_name price discount imageURLs isActive",
  });
  res.status(200).json({ message: "Wishlist", data: items });
};

export const removeFromWishlist = async (req: Request, res: Response): Promise<void> => {
  const userId = requireUserId(req);
  const productId = String(req.params.productId ?? "");

  const item = await wishlistModel.findOne({ userId, productId });
  if (!item) {throw new HttpError(404, "Item not found in wishlist");}

  await item.deleteOne();
  res.status(200).json({ message: "Removed from wishlist" });
};
