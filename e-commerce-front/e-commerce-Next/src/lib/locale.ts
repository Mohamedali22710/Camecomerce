export type Locale = "en" | "ar";

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getLocalizedField(obj: any, field: string, locale: Locale): string {
  const localized = obj[`${locale}_${field}`];
  if (typeof localized === "string" && localized.trim()) return localized;
  const en = obj[`en_${field}`];
  if (typeof en === "string") return en;
  const ar = obj[`ar_${field}`];
  if (typeof ar === "string") return ar;
  return "";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseImageURLs(product?: {
  imageURLs?: string | string[];
  images?: string[];
  imageURL?: string;
} | any): string[] {
  if (!product) return ["/placeholder.svg"];

  // 1. If imageURLs is already an array of strings
  if (Array.isArray(product.imageURLs) && product.imageURLs.length > 0) {
    const valid = product.imageURLs.filter((u: any) => typeof u === "string" && u.trim().length > 0);
    if (valid.length > 0) return valid;
  }

  // 2. If imageURLs is a string
  if (typeof product.imageURLs === "string" && product.imageURLs.trim().length > 0) {
    const trimmed = product.imageURLs.trim();
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const valid = parsed.filter((u: any) => typeof u === "string" && u.trim().length > 0);
          if (valid.length > 0) return valid;
        }
      } catch {}
    } else if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("/")) {
      return [trimmed];
    }
  }

  // 3. If images array
  if (Array.isArray(product.images) && product.images.length > 0) {
    const valid = product.images.filter((u: any) => typeof u === "string" && u.trim().length > 0);
    if (valid.length > 0) return valid;
  }

  // 4. If single imageURL property
  if (typeof product.imageURL === "string" && product.imageURL.trim().length > 0) {
    return [product.imageURL.trim()];
  }

  return ["/placeholder.svg"];
}

export const localeFlags: Record<Locale, string> = {
  en: "EN",
  ar: "AR",
};

export const localeNames: Record<Locale, string> = {
  en: "English",
  ar: "العربية",
};

export const dir = (locale: string): "ltr" | "rtl" =>
  locale === "ar" ? "rtl" : "ltr";

export function useFormatPrice(locale: string): (price: number) => string {
  const intlLocale = locale === "ar" ? "ar-SA" : "en-US";
  const currency = "SAR";
  return (price: number) =>
    new Intl.NumberFormat(intlLocale, {
      style: "currency",
      currency,
    }).format(price);
}
