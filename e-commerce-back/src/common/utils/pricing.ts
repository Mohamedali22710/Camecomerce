/** Shared money math used by carts and orders. */
export interface PricingItem {
  price: number;
  discount?: number;
  quantity: number;
}

export interface ShippingConfig {
  type: string;
  value: number;
}

/** Rounds a monetary amount to two decimal places. */
export const roundMoney = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

/** Applies a percentage discount (0-100) to a unit price. */
export const discountedUnitPrice = (price: number, discount = 0): number => {
  const safePrice = Number(price) || 0;
  const safeDiscount = Math.min(100, Math.max(0, Number(discount) || 0));
  return roundMoney(safePrice - (safePrice * safeDiscount) / 100);
};

/** Calculates shipping for a subtotal using a fixed amount or a percentage. */
export const calculateShipping = (subtotal: number, config: ShippingConfig): number => {
  const value = Math.max(0, Number(config.value) || 0);
  if (value === 0) {return 0;}
  if (config.type === "percentage") {return roundMoney((subtotal * value) / 100);}
  return roundMoney(value);
};

/** Calculates subtotal, shipping, and grand total for a set of priced items. */
export const calculateOrderTotals = (
  items: PricingItem[],
  shipping: ShippingConfig,
): { subtotal: number; shippingCost: number; total: number } => {
  const subtotal = roundMoney(
    items.reduce(
      (sum, item) =>
        sum + discountedUnitPrice(item.price, item.discount) * item.quantity,
      0,
    ),
  );
  const shippingCost = calculateShipping(subtotal, shipping);
  return {
    subtotal,
    shippingCost,
    total: roundMoney(subtotal + shippingCost),
  };
};
