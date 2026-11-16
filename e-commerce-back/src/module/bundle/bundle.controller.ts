/** Bundle routes: admin CRUD plus public listing/detail (MVP-06, MVP-07). */
import { Router } from "express";

import { auth } from "../../common/middleware/auth.js";
import { allowRoles } from "../../common/utils/allowRoles.js";
import { validateInput } from "../../common/utils/validate.js";
import { createBundleValidate, updateBundleValidate } from "../../common/validation/bundle.js";

import {
  createBundle,
  getActiveBundleById,
  getActiveBundles,
  getAllBundles,
  getBundleById,
  softDeleteBundle,
  updateBundle,
} from "./bundle.service.js";

const router = Router();

/** Shared admin guard, exported so the role rule can be unit-tested. */
export const bundleAdminOnly = allowRoles("admin", "superAdmin");

/** Admin routes must be registered before `/:id` to avoid route conflicts. */
router.post("/admin", auth, bundleAdminOnly, validateInput(createBundleValidate), createBundle);
router.put("/admin/:id", auth, bundleAdminOnly, validateInput(updateBundleValidate), updateBundle);
router.get("/admin", auth, bundleAdminOnly, getAllBundles);
router.get("/admin/:id", auth, bundleAdminOnly, getBundleById);
router.delete("/admin/:id", auth, bundleAdminOnly, softDeleteBundle);

/** Public routes. */
router.get("/", getActiveBundles);
router.get("/:id", getActiveBundleById);

export default router;
