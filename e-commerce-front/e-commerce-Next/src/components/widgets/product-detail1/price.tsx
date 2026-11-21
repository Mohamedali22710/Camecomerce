import type { PriceProps } from "./types";

const Price = ({ regular, sale, currency = "SAR", locale = "ar" }: PriceProps) => {
  if (!regular || !currency) return null;
  const formatCurrency = (value: number, curr: string = "SAR", loc: string = "ar") => {
    const intlLocale = loc === "ar" ? "ar-SA" : "en-US";
    return new Intl.NumberFormat(intlLocale, { style: "currency", currency: curr }).format(value);
  };
  return (
    <div className="flex items-center gap-2">
      {sale && <span className="text-right text-2xl font-bold text-primary">{formatCurrency(sale, currency, locale)}</span>}
      <span className={`text-right text-2xl font-bold ${sale ? "text-muted-foreground line-through" : "text-foreground"}`}>
        {formatCurrency(regular, currency, locale)}
      </span>
    </div>
  );
};

export { Price };
