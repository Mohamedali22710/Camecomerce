# سجل التعديلات الشامل على الباك إند (Backend Modifications Log)

تم إعداد هذا الملف لتوثيق كافة التعديلات والتطويرات التي تم إجراؤها على الباك إند (`e-commerce-back`)، بما في ذلك التعديلات في منطق الـ API، والتحقق (Validation)، والتعامل مع التخزين السحابي (Cloudinary)، وإدارة حسابات المشرفين، وإلغاء قيود المتغيرات، وتحديثات استعلامات الأقسام، وسكريبتات استيراد ونقل البيانات.

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

## 5. إزالة قيود المقاسات والمتغيرات واعتماد المخزون المباشر (Removal of Sizes & Variants Constraints & Direct Stock Field)

### خلفية ومبررات التعديل:
- كان المشروع في الأصل مصمماً لمتجر ملابس، ويعتمد على مفهوم المتغيرات المعقدة (`variants: [{ color, size, stock }]`) مع ألوان متعددة، ومقاسات ملابس (`XS, S, M, L, XL, XXL`)، وصور خاصة بكل لون (`colorImages`).
- نظراً لأن المتجر حالياً متخصص في **كاميرات المراقبة والأنظمة الأمنية**، فإن مفهوم مقاسات الملابس وتعدد ألوان الكاميرات وصور الألوان أصبح غير ملائم ومربكاً في لوحة التحكم وتجربة المستخدم.
- تم التعديل لتحويل إدارة المخزون إلى نظام مباشر وبسيط (حقل مخزون عام للقطعة `stock`) مع الحفاظ على التوافق الرجعي الكامل (Backward Compatibility) مع منطق السلة والطلبات.

### التعديلات المنفذة في الباك إند:

1. **تحديث نموذج المنتج (`src/database/model/product.model.ts`):**
   - إضافة حقل المخزون المباشر `stock` في واجهة `IProduct` ومخطط Mongoose:
     ```typescript
     stock: { type: Number, default: 100, min: 0 }
     ```

2. **تحديث قواعد التحقق (`src/module/product/product.validate.ts`):**
   - جعل كل من `variants` و `colorImages` حقولاً اختيارية `optional()` في `createProductValidate` و `updateProductValidate` بدلاً من كونها إجبارية ترفض الطلب.
   - إضافة التحقق من حقل `stock` المباشر:
     ```typescript
     stock: z.coerce.number().min(0).optional()
     ```

3. **تحديث منطق المعالجة والتوافق (`src/module/product/product.service.ts`):**
   - **في إنشاء المنتج (`createProduct`):**
     - يتم قراءة قيمة `stock` مباشرة وتعيينها (القيمة الافتراضية 100).
     - في حال لم يتم إرسال `variants` من لوحة التحكم (لأنه تم إيقاف محرر المتغيرات في الداش بورد)، يقوم السيرفر تلقائياً بإنشاء متغير افتراضي موحد:
       ```typescript
       product.variants = JSON.stringify([{ color: "Default", size: "Default", stock }]);
       ```
     - **أهمية هذا الإجراء:** يضمن استمرار عمل وحدات السلة (`src/module/cart/cart.lines.ts`)، وحجز المخزون أثناء إنشاء الطلبات (`src/module/order/order.stock.ts`)، والباقات (`src/module/bundle/bundle.service.ts`) دون أي كسر في العمليات الحسابية أو البرمجية.
   - **في تعديل المنتج (`updateProduct`):**
     - يتم قراءة وتحديث `product.stock` مباشرة.
     - تتم مزامنة كمية المتغير الافتراضي مع المخزون المحدث لضمان تطابق الأرصدة.
   - **في إخراج البيانات (`serializeProduct`):**
     - يتم إرجاع قيمة `stock` كخاصية رقمية أولية (First-Class Number Property) ضمن استجابة الـ API.

---

## 6. حساب عدد المنتجات النشطة الفعلي للأقسام والفئات الفرعية (Real Active Product Count)

### المشكلة السابقة:
- كانت تظهر أصفار `(0)` أمام أسماء الأقسام والفئات الفرعية في واجهة المتجر، بالرغم من وجود منتجات مرتبطة بها في قاعدة البيانات.
- كان المتجر يحتاج أيضاً إلى استبعاد المنتجات غير المفعلة (التي يتم إيقاف زر "نشط / غير نشط" الخاص بها في لوحة التحكم `isActive: false`) بحيث لا تُحتسب ضمن الأعداد المعروضة للمستخدم النهائي.

### التعديلات المنفذة:

1. **في خدمة الأقسام (`src/module/category/category.service.ts`):**
   - تم تحديث استعلام جلب الأقسام `categoryModel.find({ isActive: true })` ليشمل `populate` متداخل للأقسام الفرعية التابعة، ومن ثم للمنتجات التابعة لها، مع تطبيق شرط التفعيل `match: { isActive: true }`:
     ```typescript
     .populate({
       path: "subcategories",
       match: { isActive: true },
       populate: {
         path: "products",
         match: { isActive: true },
         select: "_id isActive",
       },
     })
     ```
   - حساب عدد المنتجات النشطة التابعة لكل فئة فرعية (`sub.products?.length || 0`).
   - حساب إجمالي عدد المنتجات النشطة لكل قسم رئيسي بجمع المنتجات النشطة في كافة فئاته الفرعية.
   - إرفاق خاصية `productCount` في كائن القسم وكائنات الفئات الفرعية التابعة له عند إرسال الرد للعميل.

2. **في خدمة الفئات الفرعية (`src/module/subcategory/subcategory.service.ts`):**
   - تم تحديث استعلام جلب الفئات الفرعية ليشمل جلب المنتجات المفعلة التابعة وحساب `productCount` لها، لضمان دقة الأرقام عند الاستعلام المباشر عن الفئات الفرعية عبر الـ API.

---

## 7. إدارة حسابات المشرفين والملف الشخصي للسوبر أدمن (Admin Management & Super Admin Profile)

### خلفية ومبررات التعديل:
- كانت صفحة الملف الشخصي تعرض بيانات الحساب فقط، دون إمكانية قيام السوبر أدمن بمراجعة المشرفين الآخرين الذين يملكون صلاحيات الوصول إلى الداش بورد أو حذف أي حساب مشرف.
- تم توفير نقاط نهاية (Endpoints) محصورة بصلاحية السوبر أدمن حصراً، مع تعزيز أمان عدم إمكانية حذف الحساب الشخصي أو حسابات السوبر أدمن الأخرى.

### التعديلات المنفذة في الباك إند:

1. **تحديث مسارات المستخدمين (`src/module/user/user.controller.ts`):**
   - إضافة نقطة نهاية لجلب قائمة المشرفين:
     `GET /v1/user/admins` — محمي بـ `auth` و `allowRoles("superAdmin")`.
   - إضافة نقطة نهاية لحذف حساب المشرف:
     `DELETE /v1/user/admins/:id` — محمي بـ `auth` و `allowRoles("superAdmin")`.

2. **تحديث منطق الخدمة (`src/module/user/user.service.ts`):**
   - **`getAdminsList`:** يستعلم عن الحسابات التي دورها `admin` مع استثناء صاحب الحساب الحالي (`_id !== req.user._id`) وإخفاء حقول كلمات المرور والبيانات الحساسة.
   - **`deleteAdmin`:** يتأكد من أن صاحب الطلب لا يحذف نفسه، وأن الحساب المستهدف ليس `superAdmin`، ويقوم بتنظيف الصورة الشخصية التابعة له من السحابة قبل الحذف.
   - **`updateProfile`:** إضافة دعم تعديل اسم المستخدم `name` وتغيير كلمة المرور مباشرة بتشفير bcrypt دون اشتراط كلمة المرور القديمة، بجانب الهاتف `phone` والصورة `image`، ومعالجة تفريغ حقل الهاتف عند إرساله كنص فارغ.

3. **تحديث قواعد التحقق (`src/module/user/user.validate.ts`):**
   - تحديث `updateProfileValidate` لقبول الاسم `name` وقبول كلمة المرور `password` اختيارياً (بحد أدنى 6 أحرف) وقبول الهاتف كقيمة فارغة `""` عند الرغبة في إزالته:
     ```typescript
     password: z.union([z.string().min(6).max(128), z.literal("")]).optional()
     ```
     ```typescript
     phone: z.union([phoneSchema, z.literal("")]).optional()
     ```

---

## 8. ملخص الملفات المعدلة والجديدة في الباك إند:

| المسار | نوع التعديل | الهدف من التعديل |
| :--- | :--- | :--- |
| `src/database/model/product.model.ts` | تعديل في النموذج | إضافة حقل `stock` المباشر للمنتج في مخطط Mongoose |
| `src/module/product/product.validate.ts` | تعديل التحقق | جعل `variants` و `colorImages` اختيارية وقبول حقل `stock` وقبول `imageURLs` كمصفوفة أو نص |
| `src/module/product/product.service.ts` | تعديل الخدمة | إدارة `stock` المباشر وتوليد المتغير الافتراضي للتوافق مع السلة والطلبات وحذف الصور الانتقائي |
| `src/module/product/product.validate.test.ts` | اختبارات آلية | إضافة اختبار إنشاء منتج بمخزون مباشر وبدون متغيرات، ونجاح كافة الاختبارات |
| `src/module/category/category.service.ts` | تعديل الخدمة | دعم تحديث `isActive` وحساب `productCount` الفعلي للمنتجات النشطة فقط وحذف الصور عند مسحها |
| `src/module/subcategory/subcategory.service.ts` | تعديل الخدمة | إضافة `productCount` للفئات الفرعية النشطة |
| `src/module/user/user.controller.ts` | تعديل المسارات | إضافة مسارات `GET /v1/user/admins` و `DELETE /v1/user/admins/:id` المحمية بصلاحية السوبر أدمن |
| `src/module/user/user.service.ts` | تعديل الخدمة | إضافة دوال `getAdminsList` و `deleteAdmin` وتحديث `updateProfile` لدعم الاسم والهاتف |
| `src/module/user/user.validate.ts` | تعديل التحقق | دعم حقل `name` وحقل `phone` كقيمة فارغة اختيارية |
| `import_catalog.py` | سكريبت مساند | سكريبت استيراد الكتالوج الكامل باللغات الثلاث ورفع الصور لـ Cloudinary |
| `update_translations.py` | سكريبت مساند | سكريبت تحديث الترجمات (EN / FR) في قاعدة البيانات مباشرة |
| `IMPORT_REPORT.md` | ملف توثيقي | دليل توثيق وتشغيل سكريبت الاستيراد لنقل المشروع للعميل |
| `BACKEND_CHANGES.md` | ملف توثيقي | هذا الملف التوثيقي الشامل والنهائي لكافة التعديلات في الباك إند |
