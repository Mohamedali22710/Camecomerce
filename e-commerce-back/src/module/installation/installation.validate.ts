/** Joi validation schemas for installation-request endpoints. */
import Joi from "joi";

import { objectIdSchema } from "../../common/validation/objectId.js";
import { INSTALLATION_STATUSES } from "../../database/model/installation.model.js";

const phone = Joi.string().pattern(/^\+?[1-9]\d{6,14}$/);

/** Schema for a customer creating an installation request for one of their orders. */
export const createInstallationValidate = Joi.object({
  orderId: objectIdSchema.required(),
  contactName: Joi.string().trim().min(1).max(200).required(),
  phone: phone.required(),
  address: Joi.string().trim().min(1).max(1000).required(),
  preferredDate: Joi.date().iso().optional().allow(null),
  notes: Joi.string().trim().max(1000).optional().allow("", null),
});

/** Schema for an admin updating the installation workflow. */
export const updateInstallationStatusValidate = Joi.object({
  status: Joi.string()
    .valid(...INSTALLATION_STATUSES)
    .optional(),
  scheduledAt: Joi.date().iso().optional().allow(null),
  adminNotes: Joi.string().trim().max(2000).optional().allow("", null),
}).min(1);
