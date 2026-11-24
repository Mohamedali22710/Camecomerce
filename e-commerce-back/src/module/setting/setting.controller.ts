/** Store settings routes: public shipping read + admin shipping update */
import { Router } from "express";

import { auth } from "../../common/middleware/auth.js";
import { allowRoles } from "../../common/utils/allowRoles.js";
import { validateInput } from "../../common/utils/validate.js";
import {
  getShippingSetting,
  updateShippingSetting,
} from "./setting.service.js";
import { updateShippingSettingValidate } from "./setting.validate.js";

const router = Router();

/** Public routes: get shipping configuration */
router.get("/", getShippingSetting);
router.get("/shipping", getShippingSetting);

/** Admin routes: update shipping configuration */
router.put(
  "/",
  auth,
  allowRoles("admin", "superAdmin"),
  validateInput(updateShippingSettingValidate),
  updateShippingSetting,
);
router.put(
  "/shipping",
  auth,
  allowRoles("admin", "superAdmin"),
  validateInput(updateShippingSettingValidate),
  updateShippingSetting,
);
router.patch(
  "/",
  auth,
  allowRoles("admin", "superAdmin"),
  validateInput(updateShippingSettingValidate),
  updateShippingSetting,
);
router.patch(
  "/shipping",
  auth,
  allowRoles("admin", "superAdmin"),
  validateInput(updateShippingSettingValidate),
  updateShippingSetting,
);

export default router;

