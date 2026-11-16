/** Resolves the authenticated admin's email for `addedByEmail` audit fields. */
import { Request } from "express";

import { userModel } from "../../database/model/user.model.js";

import { HttpError } from "./httpError.js";

export const currentAdminEmail = async (req: Request): Promise<string> => {
  const admin = await userModel.findById(req.user?._id);
  if (!admin?.email) {
    throw new HttpError(404, "Admin not found");
  }
  return admin.email;
};
