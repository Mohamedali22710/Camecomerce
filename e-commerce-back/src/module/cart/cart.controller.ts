/** Cart routes: add item, view cart, update quantity, remove item, clear cart */
import { Router } from "express";

import { auth } from "../../common/middleware/auth.js";
import { allowRoles } from "../../common/utils/allowRoles.js";
import { validateInput, validateParams } from "../../common/utils/validate.js";

import {
  addToCart,
  getCart,
  updateCartLineQuantity,
  removeCartLine,
  updateCartQuantity,
  removeCartItem,
  clearCart,
} from "./cart.service.js";
import {
  addCartValidate,
  updateCartQuantityValidate,
  updateCartLineValidate,
  cartLineParamsValidate,
} from "./cart.validate.js";

const router = Router();

router.use(auth, allowRoles("user"));

/**
 * @route POST /cart
 * @desc Add an item to the cart (or increase quantity if already present).
 *       Accepts a product line (productId + optional color/size) or a
 *       configured bundle line (itemType "bundle", bundleId + option codes).
 * @access User
 * @body { productId: string, color?: string, size?: string, quantity: number }
 *       or { itemType: "bundle", bundleId: string, hddOption: string,
 *            installationOption: string, quantity: number }
 * @returns { 201 } { message, data: CartLine }
 * @returns { 200 } { message, data: CartLine } (if line already existed)
 * @throws { 400 } Validation error, unknown option, or quantity exceeds stock
 * @throws { 401 } Unauthorized
 * @throws { 404 } Product/bundle not found or inactive
 * @throws { 500 } Internal server error
 */
router.post("/", validateInput(addCartValidate), addToCart);
/**
 * @route GET /cart
 * @desc Get all cart lines for the authenticated user with per-line totals
 * @access User
 * @returns { 200 } { message, data: { items, subtotal, shippingCost, total, currency } }
 * @throws { 401 } Unauthorized
 * @throws { 500 } Internal server error
 */
router.get("/", getCart);
/**
 * @route PUT /cart/:productId/:color/:size
 * @desc Update quantity of a specific product cart line (legacy route)
 * @access User
 * @body { quantity: number }
 * @returns { 200 } { message, data: CartLine }
 * @throws { 400 } Validation error or quantity exceeds stock
 * @throws { 401 } Unauthorized
 * @throws { 404 } Item not found in cart
 * @throws { 500 } Internal server error
 */
router.put("/:productId/:color/:size", validateInput(updateCartQuantityValidate), updateCartQuantity);
/**
 * @route DELETE /cart/:productId/:color/:size
 * @desc Remove a specific product cart line (legacy route)
 * @access User
 * @returns { 200 } { message }
 * @throws { 401 } Unauthorized
 * @throws { 404 } Item not found in cart
 * @throws { 500 } Internal server error
 */
router.delete("/:productId/:color/:size", removeCartItem);
/**
 * @route PUT /cart/:lineId
 * @desc Update the quantity of any cart line (product or bundle) by line id
 * @access User
 * @body { quantity: number }
 * @returns { 200 } { message, data: CartLine }
 * @throws { 400 } Validation error, line no longer available, or exceeds stock
 * @throws { 401 } Unauthorized
 * @throws { 404 } Item not found in cart
 * @throws { 500 } Internal server error
 */
router.put(
  "/:lineId",
  validateParams(cartLineParamsValidate),
  validateInput(updateCartLineValidate),
  updateCartLineQuantity,
);
/**
 * @route DELETE /cart/:lineId
 * @desc Remove any cart line (product or bundle) by line id
 * @access User
 * @returns { 200 } { message }
 * @throws { 401 } Unauthorized
 * @throws { 404 } Item not found in cart
 * @throws { 500 } Internal server error
 */
router.delete("/:lineId", validateParams(cartLineParamsValidate), removeCartLine);
/**
 * @route DELETE /cart
 * @desc Clear all items from the cart
 * @access User
 * @returns { 200 } { message }
 * @throws { 401 } Unauthorized
 * @throws { 500 } Internal server error
 */
router.delete("/", clearCart);

export default router;
