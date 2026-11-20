# 🌐 خطة إزالة الفرنساوي بالكامل — `e-commerce-front` (Next.js) [تم التنفيذ بنجاح 100%]

> [!NOTE]
> تم فحص وتطهير مشروع الواجهة الأمامية بالكامل (Next.js مع `next-intl`). تم حذف ملفات الترجمة الفرنسية وإزالة الحقول والأنواع والـ fallbacks الخاصة باللغة الفرنسية مع بقاء اللغتين العربية والإنجليزية فقط وضمان عدم كسر أي لوجيك.

---

## حالة التنفيذ: ✅ مكتملة بالكامل ومُختبرة (17 مهمة)

| # | الملف | نوع التعديل | الحالة |
|---|-------|-------------|--------|
| 1 | `messages/fr.json` | حذف ملف الترجمة الفرنسي بالكامل | ✅ تم الحذف |
| 2 | `src/i18n/routing.ts` | حصر `locales` في `["en", "ar"]` فقط | ✅ تم التعديل |
| 3 | `src/i18n/request.ts` | تحديث تحقق الـ locales إلى `"en" \| "ar"` فقط | ✅ تم التعديل |
| 4 | `src/lib/locale.ts` | تحديث `Locale` type، إزالة `fr` من `localeFlags` و `localeNames` و `getLocalizedField` و `useFormatPrice` | ✅ تم التعديل |
| 5 | `src/components/widgets/locale-switcher.tsx` | إزالة `"fr"` وحصر التبديل بين العربية والإنجليزية فقط | ✅ تم التعديل |
| 6 | `src/proxy.ts` | تحديث التحقق من كوكي و `Accept-Language` إلى `"en" \| "ar"` | ✅ تم التعديل |
| 7 | `src/contexts/CartContext.tsx` | إزالة `fr_name` من `CartItem` والـ mapping | ✅ تم التعديل |
| 8 | `src/components/widgets/shopping-cart1.tsx` | تحويل `locale as "en" \| "fr" \| "ar"` إلى نوع `Locale` النظيف | ✅ تم التعديل |
| 9 | `src/components/widgets/product-card-cctv/types.ts` | إزالة `fr_name` و `fr_description` من `CCTVProduct` | ✅ تم التعديل |
| 10 | `src/components/widgets/product-card-cctv/product-card-cctv.tsx` | إزالة `fr_name` من بيانات الإضافة للسلة | ✅ تم التعديل |
| 11 | `src/components/widgets/home/category-grid-section.tsx` | إزالة `fr_name` من واجهة `HomeCategory` | ✅ تم التعديل |
| 12 | `src/app/categories/page.tsx` | إزالة `fr_name` من واجهة `Category` | ✅ تم التعديل |
| 13 | `src/app/categories/[category]/page.tsx` | إزالة `fr_name` من واجهة `Subcategory` | ✅ تم التعديل |
| 14 | `src/app/products/page.tsx` | إزالة `fr_name` و `fr_description` من واجهة `Product` | ✅ تم التعديل |
| 15 | `src/app/products/[product]/page.tsx` | إزالة `fr_name` و `fr_description` وتحديث استدعاءات `getLocalizedField` لنوع `Locale` | ✅ تم التعديل |
| 16 | `src/app/subcategories/page.tsx` | إزالة `fr_name` من واجهة `Subcategory` | ✅ تم التعديل |
| 17 | `src/app/subcategories/[subcategory]/page.tsx` | إزالة `fr_name` من `Product` و `SubcategoryInfo` و `SidebarSubcategory` | ✅ تم التعديل |

---

## تفاصيل التعديلات المُنفذة

### 1. حذف ملف الترجمة الفرنسي
- تم حذف `messages/fr.json` نهائياً.

### 2. مسارات ولغات الموقع (`src/i18n/routing.ts` & `src/i18n/request.ts`)
- إزالة `"fr"` من مصفوفة اللغات المدعومة ليصبح:
  ```typescript
  export const routing = defineRouting({
    locales: ["en", "ar"],
    defaultLocale: "en",
    localePrefix: "never",
  });
  ```

### 3. دوال وتوابع اللغات (`src/lib/locale.ts`)
- تحديث النوع:
  ```typescript
  export type Locale = "en" | "ar";
  ```
- إزالة البحث عن الحقول الفرنسية في `getLocalizedField`:
  ```typescript
  export function getLocalizedField(obj: any, field: string, locale: Locale): string {
    const localized = obj[`${locale}_${field}`];
    if (typeof localized === "string" && localized.trim()) return localized;
    const en = obj[`en_${field}`];
    if (typeof en === "string") return en;
    const ar = obj[`ar_${field}`];
    if (typeof ar === "string") return ar;
    return "";
  }
  ```
- إزالة علم فرنسا واللغة الفرنسية من `localeFlags` و `localeNames`.
- تحديث `useFormatPrice` ليصبح:
  ```typescript
  const intlLocale = locale === "ar" ? "ar-SA" : "en-US";
  ```

### 4. زر تبديل اللغة (`src/components/widgets/locale-switcher.tsx`)
- أصبح يعتمد على `Locale` (`"en" | "ar"`).
- القائمة المنسدلة تعرض تلقائياً فقط اللغات الموجودة في `localeNames` (العربية والإنجليزية).

### 5. وسيط التوجيه (`src/proxy.ts`)
- حصر لغات التفاوض (`negotiateLocale`) على `"en" | "ar"`.

### 6. سياق السلة والقطع (`CartContext.tsx` و `shopping-cart1.tsx`)
- إزالة `fr_name` من واجهات السلة وتخزين البيانات.
- تنظيف نداءات الترجمة.

### 7. مكونات المتجر والبطاقات وصفحات الأقسام والمنتجات
- إزالة حقول `fr_name` و `fr_description` من بطاقات المنتجات `ProductCardCctv` ومكون شبكة الأقسام `CategoryGridSection`.
- تنظيف واجهات صفحات:
  - `/categories`
  - `/categories/[category]`
  - `/subcategories`
  - `/subcategories/[subcategory]`
  - `/products`
  - `/products/[product]`

---

## التحقق والاختبار (Verification)

1. **فحص الـ Typescript (`npx tsc --noEmit`):**
   - النتيجة: **0 أخطاء (Exit code 0)**.
2. **فحص البحث النصي للغة الفرنسية:**
   - النتيجة: **0 نتائج مطابقة لـ `fr_name`, `fr_description`, `"fr"`, `'fr'`, `fr-FR`, `Français` داخل مجلد `src`**.
