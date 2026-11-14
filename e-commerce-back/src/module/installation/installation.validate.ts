/** Zod validation schemas for installation-request endpoints. */
import { z } from "zod";

import { phoneSchema } from "../../common/validation/fields.js";
import { objectIdSchema } from "../../common/validation/objectId.js";
import { INSTALLATION_STATUSES } from "../../database/model/installation.model.js";

/** Schema for a customer creating an installation request for one of their orders. */
export const createInstallationValidate = z.looseObject({
  orderId: objectIdSchema,
  contactName: z.string().trim().min(1).max(200),
  phone: phoneSchema,
  address: z.string().trim().min(1).max(1000),
  preferredDate: z.coerce.date().nullable().optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
});

/** Schema for an admin updating the installation workflow. */
export const updateInstallationStatusValidate = z
  .looseObject({
    status: z.enum(INSTALLATION_STATUSES).optional(),
    scheduledAt: z.coerce.date().nullable().optional(),
    adminNotes: z.string().trim().max(2000).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });
