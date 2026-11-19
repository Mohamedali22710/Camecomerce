# سجل التعديلات الشامل على الباك إند (Backend Modifications Log)

تم إعداد هذا الملف لتوثيق كافة التعديلات والتطويرات التي تم إجراؤها على الباك إند (`e-commerce-back`)، بما في ذلك التعديلات في منطق الـ API، والتحقق (Validation)، والتعامل مع التخزين السحابي (Cloudinary)، وسكريبتات استيراد ونقل البيانات.

---

## 1. تعديل خدمة المنتجات (`src/module/product/product.service.ts`)

### المشكلة السابقة:
- في السابق، عند تحديث منتج ورفع صور جديدة، كان الباك إند يقوم بحذف **جميع** الصور القديمة للمنتج من Cloudinary واستبدالها بالصور الجديدة فقط (`deleteImagesByUrls(parseJsonArray(product.imageURLs))` ثم رفع الجديد).
- لم يكن هناك أي دعم لحذف صورة واحدة أو إبقاء صور معينة وحذف أخرى، مما جعل التحكم في الصور من الداش بورد غير عملي ويؤدي لفقدان الصور القديمة.

### التعديل المنفذ:
1. **دعم الحفظ الانتقائي للصور (Selective Image Retention & Deletion):**
   - تم قراءة مصفوفة الصور القديمة `oldImageUrls` ومقارنتها بمصفوفة الصور التي حدد المستخدم الإبقاء عليها `keptImageUrls`.
   - يتم استخراج الصور التي حذفها المستخدم فقط (`deletedUrls`) وحذفها من حساب Cloudinary:
     ```typescript
     const deletedUrls = oldImageUrls.filter((url) => !keptImageUrls!.includes(url));
     if (deletedUrls.length > 0) {
       await deleteImagesByUrls(deletedUrls, "products");
     }
     ```
2. **دمج الصور القديمة المحتفظ بها مع الصور الجديدة المرفوعة:**
   - يتم رفع الصور الجديدة إن وجدت إلى Cloudinary.
   - يتم دمج المصفوفة القديمة المتبقية مع الروابط الجديدة المرفوعة دون أي تكرار أو مسح للصور المطلوبة:
     ```typescript
     const baseUrls = keptImageUrls !== null ? keptImageUrls : oldImageUrls;
     const finalUrls = [...baseUrls, ...newUploadedUrls];
     product.imageURLs = finalUrls.length > 0 ? JSON.stringify(finalUrls) : null;
     ```
3. **مرونة استقبال بيانات `imageURLs`:**
   - أصبح يقبل `imageURLs` سواء أُرسلت كـ `Array<string>`، أو كـ `JSON string` مفكك، أو كنص فردي، مما يضمن التوافق التام مع كل من طلبات JSON العادية وطلبات `multipart/form-data`.

---

## 2. تحديث التحقق من بيانات المنتجات (`src/module/product/product.validate.ts`)

### المشكلة السابقة:
- كان التحقق الخاص بـ `imageURLs` في `updateProductValidate` محصوراً في نوع `z.string().nullable().optional()`.
- عندما ترسل لوحة التحكم (React-Admin) مصفوفة صور `['https://...']` كـ JSON، كان الـ Validator يفشل ويعيد `400 Bad Request` لأن القيمة ليست `string`.

### التعديل المنفذ:
- تم تعديل الـ Schema لتقبل إما مصفوفة نصوص أو نص مفرد:
  ```typescript
  // السابق:
  // imageURLs: z.string().nullable().optional(),

  // الحالي:
  imageURLs: z.union([z.string(), z.array(z.string())]).nullable().optional(),
  ```

---

## 3. تعديل خدمة الأقسام (`src/module/category/category.service.ts`)

### المشكلة السابقة:
- لم يكن يتم تحديث حالة التفعيل `isActive` للقسم عند التعديل من الداش بورد.
- عند إزالة صورة القسم أو استبدالها بدون رفع ملف جديد، لم تكن الصورة القديمة تُحذف من Cloudinary، وكانت تظل معلقة في السحابة.

### التعديل المنفذ:
1. **دعم خاصية `isActive`:**
   - إضافة قراءة وتحديث `isActive` عند تعديل بيانات القسم:
     ```typescript
     if (isActive !== undefined) {
       category.isActive = isActive === true || isActive === "true";
     }
     ```
2. **حذف الصورة المستبعدة من Cloudinary:**
   - عند طلب مسح صورة القسم (`imageURL = ""` أو `image = null`)، يتم الآن حذف الصورة فوراً من Cloudinary لتوفير المساحة وتجنب الملفات المعلقة:
     ```typescript
     const isClearing = !imageURL || imageURL === "null" || imageURL === "";
     if (isClearing && category.imageURL) {
       try {
         await deleteImageByUrl(category.imageURL, "categories");
       } catch {}
     }
     category.imageURL = isClearing ? null : imageURL;
     ```

---

## 4. سكريبتات استيراد الكتالوج وترجمة البيانات (Database & Catalog Scripts)

تم إنشاء وتجهيز سكريبتين في مجلد الباك إند لأتمتة معالجة المنتجات وتجهيزها لنقل المشروع إلى حسابات العميل:

### أ) `e-commerce-back/import_catalog.py`:
- **الوظيفة:** سكريبت شامل يقوم برفع الكتالوج بالكامل إلى Cloudinary و MongoDB Atlas.
- **المميزات:**
  - متعدد اللغات بالكامل: يرفع البيانات بالعربية والإنجليزية والفرنسية (`ar_name`, `en_name`, `fr_name`, `ar_description`, `en_description`, `fr_description`).
  - ينشئ الأقسام الرئيسية (Categories)، والأقسام الفرعية (Subcategories)، ويربط كل منتج بالقسم التابع له تلقائياً.
  - يقوم بتحميل الصور ورفعها على حساب Cloudinary المحدد في ملف الإعدادات وربط الروابط الناتجة بالمنتجات.
  - جاهز للتشغيل عند نقل المشروع لبيئة الإنتاج أو حسابات العميل.

### ب) `e-commerce-back/update_translations.py`:
- **الوظيفة:** سكريبت سريع ومخصص لتحديث نصوص الترجمة الإنجليزية والفرنسية للمنتجات والأقسام الموجودة حالياً في قاعدة البيانات مباشرة استناداً إلى ملف `silken_catalog_fully_translated.md`.
- **المميزات:** يحدث النصوص والأسماء في ثوانٍ دون الحاجة لإعادة رفع الصور أو تعديل الروابط المحفوظة.

### ج) `e-commerce-back/IMPORT_REPORT.md`:
- دليل تشغيل تفصيلي يشرح خطوة بخطوة كيفية تشغيل سكريبت الاستيراد، والمتغيرات البيئية المطلوبة (`MONGODB_URI`, `CLOUDINARY_*`)، مع تعليمات نقل الملكية إلى العميل.

---

## 5. ملخص الملفات المعدلة في الباك إند:

| المسار | نوع التعديل | الهدف من التعديل |
| :--- | :--- | :--- |
| `src/module/product/product.service.ts` | تعديل برمجي | دعم الحذف الانتقائي للصور + دمج الصور المتبقية مع الجديدة + حذف المستبعد من Cloudinary |
| `src/module/product/product.validate.ts` | تعديل برمجي | قبول `imageURLs` كمصفوفة أو كنص لتفادي خطأ Validation من الداش بورد |
| `src/module/category/category.service.ts` | تعديل برمجي | دعم تحديث `isActive` للقسم + حذف صورة القسم من Cloudinary عند مسحها |
| `import_catalog.py` | ملف جديد | سكريبت استيراد الكتالوج الكامل باللغات الثلاث ورفع الصور لـ Cloudinary |
| `update_translations.py` | ملف جديد | سكريبت تحديث الترجمات (EN / FR) في قاعدة البيانات مباشرة |
| `IMPORT_REPORT.md` | ملف جديد | دليل توثيق وتشغيل سكريبت الاستيراد لنقل المشروع للعميل |
| `BACKEND_CHANGES.md` | ملف جديد | هذا الملف التوثيقي الشامل لجميع التعديلات |

