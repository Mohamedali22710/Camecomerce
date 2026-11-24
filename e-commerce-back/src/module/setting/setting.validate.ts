/** Zod validation schemas for store settings endpoints. */
import { z } from "zod";
import { SHIPPING_COST_TYPES } from "../../database/model/setting.model.js";

export const updateShippingSettingValidate = z.looseObject({
  shippingCost: z.coerce.number().min(0, "Shipping cost cannot be negative"),
  shippingType: z.enum(SHIPPING_COST_TYPES).optional(),
});

