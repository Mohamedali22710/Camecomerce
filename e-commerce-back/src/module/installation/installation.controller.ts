/** Installation-request routes: customer requests + admin workflow management. */
import { Router } from "express";

import { auth } from "../../common/middleware/auth.js";
import { allowRoles } from "../../common/utils/allowRoles.js";
import { validateInput } from "../../common/utils/validate.js";

import {
  cancelInstallationRequest,
  createInstallationRequest,
  getAllInstallationRequests,
  getInstallationRequestById,
  getMyInstallationRequests,
  updateInstallationStatus,
} from "./installation.service.js";
import {
  createInstallationValidate,
  updateInstallationStatusValidate,
} from "./installation.validate.js";

const router = Router();

router.use(auth);

/** Admin routes must be registered before the parameterized `/:id` route. */
router.get("/admin", allowRoles("admin", "superAdmin"), getAllInstallationRequests);
router.patch(
  "/admin/:id",
  allowRoles("admin", "superAdmin"),
  validateInput(updateInstallationStatusValidate),
  updateInstallationStatus,
);

/** Customer routes. */
router.post(
  "/",
  allowRoles("user", "admin", "superAdmin"),
  validateInput(createInstallationValidate),
  createInstallationRequest,
);
router.get("/mine", allowRoles("user", "admin", "superAdmin"), getMyInstallationRequests);
router.post(
  "/:id/cancel",
  allowRoles("user", "admin", "superAdmin"),
  cancelInstallationRequest,
);
router.get("/:id", allowRoles("user", "admin", "superAdmin"), getInstallationRequestById);

export default router;
