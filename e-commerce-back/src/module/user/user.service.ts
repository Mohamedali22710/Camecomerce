/** User business logic: profile get/update and avatar upload. */
import bcrypt from "bcryptjs";
import { Request, Response } from "express";

import { HttpError } from "../../common/utils/httpError.js";
import {
  deleteImageByUrl,
  uploadImage,
} from "../../common/utils/uploadImage.js";
import { IUser, userModel } from "../../database/model/user.model.js";

const requireUserId = (req: Request): string => {
  const userId = req.user?._id;
  if (!userId) {throw new HttpError(401, "Unauthorized");}
  return userId;
};

/** Strips the password hash (and other non-public fields) before responding. */
const publicUser = (user: IUser) => {
  const { password: _password, googleId: _googleId, ...rest } = user.toObject();
  return rest;
};

const normalizePhone = (phone: string): string => {
  const compact = phone.replace(/[\s()-]/g, "");
  return compact.startsWith("+") ? compact : `+${compact}`;
};

export const getProfile = async (req: Request, res: Response): Promise<void> => {
  const user = await userModel.findById(requireUserId(req)).select("-password -googleId");
  if (!user) {throw new HttpError(404, "User not found");}
  res.status(200).json({ message: "Profile", data: user });
};

export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  const user = await userModel.findById(requireUserId(req));
  if (!user) {throw new HttpError(404, "User not found");}

  if (req.body.name !== undefined) {user.name = req.body.name;}
  if (req.body.phone !== undefined) {
    user.phone = req.body.phone.trim() === "" ? null : normalizePhone(req.body.phone);
  }
  if (req.body.password && typeof req.body.password === "string" && req.body.password.trim().length >= 6) {
    user.password = await bcrypt.hash(req.body.password.trim(), 10);
  }

  if (req.file) {
    try {
      if (user.imageURL) {await deleteImageByUrl(user.imageURL, "profiles");}
      const result = await uploadImage(req.file, "profiles");
      user.imageURL = result.url;
    } catch (error: any) {
      throw new HttpError(400, error?.message || "Image upload failed");
    }
  }

  await user.save();
  res.status(200).json({ message: "Profile updated", data: publicUser(user) });
};

export const getAdminsList = async (req: Request, res: Response): Promise<void> => {
  const currentUserId = requireUserId(req);
  const admins = await userModel
    .find({ role: "admin", _id: { $ne: currentUserId } })
    .select("-password -googleId")
    .sort({ createdAt: -1 });

  res.status(200).json({ message: "Admin list", data: admins });
};

export const deleteAdmin = async (req: Request, res: Response): Promise<void> => {
  const currentUserId = requireUserId(req);
  const { id } = req.params;

  if (id === currentUserId) {
    throw new HttpError(400, "Cannot delete your own account");
  }

  const adminUser = await userModel.findById(id);
  if (!adminUser) {
    throw new HttpError(404, "Admin account not found");
  }

  if (adminUser.role === "superAdmin") {
    throw new HttpError(403, "Cannot delete superAdmin accounts");
  }

  if (adminUser.imageURL) {
    try {
      await deleteImageByUrl(adminUser.imageURL, "profiles");
    } catch {
      // Ignore image deletion error on account removal
    }
  }

  await userModel.findByIdAndDelete(id);
  res.status(200).json({ message: "Admin account deleted successfully", data: { id } });
};

export const uploadAvatar = async (req: Request, res: Response): Promise<void> => {
  if (!req.file) {throw new HttpError(400, "No image provided");}

  const user = await userModel.findById(requireUserId(req));
  if (!user) {throw new HttpError(404, "User not found");}

  try {
    if (user.imageURL) {await deleteImageByUrl(user.imageURL, "profiles");}
    const result = await uploadImage(req.file, "profiles");
    user.imageURL = result.url;
    await user.save();
    res.status(200).json({ message: "Avatar uploaded", data: { imageURL: result.url } });
  } catch (error: any) {
    throw new HttpError(400, error?.message || "Image upload failed");
  }
};
