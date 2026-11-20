# 🖥️ خطة إزالة الفرنساوي — `e-commerce-Dash` (مكتملة ومُنفذة بالكامل ✅)

> [!NOTE]
> تمت إزالة اللغة الفرنسية من الداش بورد بالكامل بنسبة 100%:
> - إزالة الـ types والـ schemas والـ models
> - حذف ملف `fr.ts` وحزمته من `package.json`
> - تعديل زرار اللغات ليعمل حصرياً بالعربية والإنجليزية
> - تعديل قوالب ونماذج وجداول الـ Categories والـ Subcategories والـ Products
> - **اجتياز فحص الـ TypeScript (`tsc`) وبناء الإنتاج (`vite build`) بنجاح تام وبدون أي أخطاء!**

---

## جدول الملفات المُعدلة والمُنظفة (17 مهمة مكتملة):

| # | الملف | طبيعة التعديل | الحالة |
|---|-------|---------------|--------|
| 1 | `src/types.ts` | حذف `fr_name` و `fr_description` من interfaces الـ Category, Product, Subcategory | ✅ منتهي |
| 2 | `src/App.tsx` | إزالة استيراد `fr.ts` وحذفه من i18nProvider و `locales` array و `getInitialLocale` | ✅ منتهي |
| 3 | `src/i18n/fr.ts` | **حذف الملف كاملاً** | ✅ منتهي |
| 4 | `package.json` | إزالة تبعية `"ra-language-french"` | ✅ منتهي |
| 5 | `src/layout/CustomLocaleSwitcher.tsx` | إزالة الفرنسية من مصفوفة `LANGUAGES` | ✅ منتهي |
| 6 | `src/i18n/ar/index.ts` | حذف مفاتيح `name_fr`, `description_fr`, وتعديل `name_ar_fr` إلى `name_ar` | ✅ منتهي |
| 7 | `src/i18n/ar/resources.ts` | حذف مفتاح `fr_name` من subcategories | ✅ منتهي |
| 8 | `src/i18n/en.ts` | حذف مفاتيح `name_fr`, `description_fr`, وتعديل `name_ar_fr` إلى `name_ar` | ✅ منتهي |
| 9 | `src/categories/CategoryCreate.tsx` | حذف حقل `fr_name` وتعديل النص التوضيحي للغتين | ✅ منتهي |
| 10 | `src/categories/CategoryEdit.tsx` | حذف حقل `fr_name` | ✅ منتهي |
| 11 | `src/categories/CategoryList.tsx` | إزالة عرض `record.fr_name` من الـ Card وعمود الجدول `TextField` | ✅ منتهي |
| 12 | `src/categories/CategoryShow.tsx` | حذف عمود `fr_name` من layout العرض | ✅ منتهي |
| 13 | `src/subcategories/SubcategoryCreate.tsx` | حذف حقل `fr_name` والـ state `frName` وحذفه من payload الإرسال | ✅ منتهي |
| 14 | `src/subcategories/SubcategoryEdit.tsx` | حذف حقل `fr_name` والـ state `frName` وحذفه من payload التحديث والإنشاء | ✅ منتهي |
| 15 | `src/subcategories/SubcategoryList.tsx` | إزالة `fr_name` من جدول التجميع والـ Card view وتحديث عنوان العمود إلى `name_ar` | ✅ منتهي |
| 16 | `src/products/ProductCreate.tsx` | حذف حقلي `fr_name` و `fr_description` وتعديل النص التوضيحي للغتين | ✅ منتهي |
| 17 | `src/products/ProductEdit.tsx` | حذف حقلي `fr_name` و `fr_description` وتعديل النص التوضيحي للغتين | ✅ منتهي |
