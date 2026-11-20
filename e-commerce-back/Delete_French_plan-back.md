# 🗂️ خطة إزالة الفرنساوي — `e-commerce-back` (مكتملة ✅)

> [!NOTE]
> تمت المراجعة الشاملة والتنفيذ الكامل: لم نكتفِ فقط بالموديلز والفاليديشن كما كان في الخطة الأولية، بل شمل التنظيف كل السيرفيسز، مساعدات الفرز والبحث، الـ Cart/Wishlist projections، وتحديث الاسكربتات التابعة للباك إند.
> **النتيجة: تم اجتياز فحص الـ TypeScript (tsc) بدون أي أخطاء بنسبة 100%، وجميع الـ Test Suites تعمل بكفاءة.**

---

## قائمة الملفات المُعدلة والمُنظفة بالكامل:

| #   | الملف                                            | طبيعة التعديل                                                                           | الحالة   |
| --- | ------------------------------------------------ | --------------------------------------------------------------------------------------- | -------- |
| 1   | `src/database/model/category.model.ts`           | إزالة `fr_name` من الـ Interface والـ Schema                                            | ✅ منتهي |
| 2   | `src/database/model/product.model.ts`            | إزالة `fr_name` و `fr_description` من الـ Interface والـ Schema                         | ✅ منتهي |
| 3   | `src/database/model/subcategory.model.ts`        | إزالة `fr_name` من الـ Interface والـ Schema                                            | ✅ منتهي |
| 4   | `src/module/category/category.validate.ts`       | إزالة `fr_name` من `createCategoryValidate` و `updateCategoryValidate`                  | ✅ منتهي |
| 5   | `src/module/subcategory/subcategory.validate.ts` | إزالة `fr_name` من `createSubcategoryValidate` و `updateSubcategoryValidate`            | ✅ منتهي |
| 6   | `src/module/product/product.validate.ts`         | إزالة `fr_name` و `fr_description` من `createProductValidate` و `updateProductValidate` | ✅ منتهي |
| 7   | `src/common/utils/buildQuery.ts`                 | إزالة `fr_name` من `allowedSortFields` و `searchFields`                                 | ✅ منتهي |
| 8   | `src/module/category/category.service.ts`        | إزالة `fr_name` من الفرز والتحقق من التكرار والإنشاء والتعديل                           | ✅ منتهي |
| 9   | `src/module/subcategory/subcategory.service.ts`  | إزالة `fr_name` من الفرز والتحقق من التكرار والإنشاء والتعديل                           | ✅ منتهي |
| 10  | `src/module/product/product.service.ts`          | إزالة `fr_name` و `fr_description` من الإنشاء والتعديل                                  | ✅ منتهي |
| 11  | `src/module/product/product.controller.ts`       | تنظيف الـ JSDoc documentation من معايير الفرنساوي                                       | ✅ منتهي |
| 12  | `src/module/bundle/bundle.service.ts`            | إزالة `fr_name` من الـ Component Summaries                                              | ✅ منتهي |
| 13  | `src/module/bundle/bundle.service.test.ts`       | إزالة `fr_name` من بيانات الموك في الاختبارات                                           | ✅ منتهي |
| 14  | `src/module/cart/cart.lines.ts`                  | إزالة `fr_name` من الـ Order Snapshot Interfaces و Functions                            | ✅ منتهي |
| 15  | `src/module/cart/cart.service.ts`                | إزالة `fr_name` من populate select و Bundle Summary                                     | ✅ منتهي |
| 16  | `src/module/wishlist/wishlist.service.ts`        | إزالة `fr_name` من populate select للمفضلة                                              | ✅ منتهي |
| 17  | `import_catalog.py`                              | إزالة حقول وبارسينج واستيراد الفرنساوي من اسكربت استيراد الكتالوج                       | ✅ منتهي |
| 18  | `update_translations.py`                         | إزالة بارسينج الفرنساوي وتحديث الداتا بيز فقط بالعربي والإنجليزي                        | ✅ منتهي |

---

> [!IMPORTANT]
> **سلامة الـ Logic والداتا:**
>
> - لم يتم المساس بأي لوجيك للأعمال (Business Logic) الخاص باللغتين العربية والإنجليزية.
> - الـ endpoints أصبحت تقبل وتعالج فقط `en_name` و `ar_name`، وكذلك `en_description` و `ar_description`.
> - الـ TypeScript Compilation سليم 100% بدون أي Warning أو Error.

