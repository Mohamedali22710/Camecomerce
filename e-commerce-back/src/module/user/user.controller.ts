/** User routes: profile retrieval & update, avatar upload, and admin management */
import { Router } from "express";

import { auth } from "../../common/middleware/auth.js";
import { uploadSingle } from "../../common/middleware/multer.js";
import { allowRoles } from "../../common/utils/allowRoles.js";
import { validateInput } from "../../common/utils/validate.js";

import {
  getProfile,
  updateProfile,
  uploadAvatar,
  getAdminsList,
  deleteAdmin,
} from "./user.service.js";
import { updateProfileValidate } from "./user.validate.js";

const router = Router();

/**
 * @route GET /v1/user/profile
 * @desc Get authenticated user's profile
 * @access User
 * @returns { 200 } { message, data: user }
 * @throws { 401 } Unauthorized
 * @throws { 404 } User not found
 */
router.get("/profile", auth, getProfile);
/**
 * @route PUT /v1/user/profile
 * @desc Update authenticated user's profile (name, phone, avatar)
 * @access User
 * @body { name?: string, phone?: string } + multipart image (optional)
 * @returns { 200 } { message, data: user }
 * @throws { 400 } Invalid file type / No fields to update
 * @throws { 401 } Unauthorized
 * @throws { 404 } User not found
 */
router.put(
  "/profile",
  auth,
  uploadSingle(2, "image"),
  validateInput(updateProfileValidate),
  updateProfile,
);
/**
 * @route POST /v1/user/upload-avatar
 * @desc Upload a new avatar image for the authenticated user
 * @access User
 * @body { image: file } - Multipart image upload
 * @returns { 200 } { message, data: { imageURL } }
 * @throws { 400 } No image provided / Invalid file type
 * @throws { 401 } Unauthorized
 * @throws { 404 } User not found
 */
router.post("/upload-avatar", auth, uploadSingle(2, "image"), uploadAvatar);

/**
 * @route GET /v1/user/admins
 * @desc List all staff admin accounts (excluding self)
 * @access SuperAdmin
 * @returns { 200 } { message, data: admins[] }
 * @throws { 401 } Unauthorized
 * @throws { 403 } Forbidden
 */
router.get("/admins", auth, allowRoles("superAdmin"), getAdminsList);

/**
 * @route DELETE /v1/user/admins/:id
 * @desc Delete a staff admin account
 * @access SuperAdmin
 * @returns { 200 } { message, data: { id } }
 * @throws { 400 } Cannot delete own account
 * @throws { 401 } Unauthorized
 * @throws { 403 } Forbidden / Cannot delete superAdmin
 * @throws { 404 } Admin not found
 */
router.delete("/admins/:id", auth, allowRoles("superAdmin"), deleteAdmin);

export default router;
