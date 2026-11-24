/** Store settings service: retrieves and updates general store parameters (shipping, etc.). */
import { Request, Response } from "express";

import { env } from "../../../config/env.service.js";
import { settingModel } from "../../database/model/setting.model.js";

/**
 * Returns the effective shipping configuration from DB or env fallback.
 * Used internally by cart.service and order.service.
 */
export const getEffectiveShippingConfig = async (): Promise<{ type: string; value: number }> => {
  try {
    const setting = await settingModel.findOne({ key: "store_settings" }).lean();
    if (setting && typeof setting.shippingCost === "number") {
      return {
        type: setting.shippingType || "fixed",
        value: setting.shippingCost,
      };
    }
  } catch (err) {
    console.error("Failed to load shipping settings from DB, falling back to env:", err);
  }
  return {
    type: env.SHIPPING_COST_TYPE || "fixed",
    value: Number(env.SHIPPING_COST_VALUE) || 0,
  };
};

/**
 * Public endpoint handler: retrieves the current shipping settings and currency.
 */
export const getShippingSetting = async (_req: Request, res: Response): Promise<void> => {
  try {
    const config = await getEffectiveShippingConfig();
    res.status(200).json({
      message: "Shipping settings retrieved successfully",
      data: {
        shippingCost: config.value,
        shippingType: config.type,
        currency: env.CURRENCY,
      },
    });
  } catch (err) {
    console.error("Error retrieving shipping settings:", err);
    res.status(500).json({ message: "Failed to retrieve shipping settings" });
  }
};

/**
 * Admin endpoint handler: updates the store's shipping settings.
 */
export const updateShippingSetting = async (req: Request, res: Response): Promise<void> => {
  try {
    const { shippingCost, shippingType } = req.body;
    const updatedBy =
      (req.user as any)?.email || (req.user as any)?._id?.toString() || null;

    const update: Record<string, any> = {
      shippingCost: Number(shippingCost),
      updatedBy,
    };
    if (shippingType) {
      update.shippingType = shippingType;
    }

    const doc = await settingModel.findOneAndUpdate(
      { key: "store_settings" },
      { $set: update },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    res.status(200).json({
      message: "Shipping settings updated successfully",
      data: {
        shippingCost: doc.shippingCost,
        shippingType: doc.shippingType,
        currency: env.CURRENCY,
      },
    });
  } catch (err) {
    console.error("Error updating shipping settings:", err);
    res.status(500).json({ message: "Failed to update shipping settings" });
  }
};

