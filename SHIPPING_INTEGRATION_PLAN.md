# خطة عمل شاملة: جعل تكلفة الشحن/التوصيل ديناميكية وقابلة للتعديل من لوحة التحكم

> **تاريخ الإعداد:** 24 نوفمبر 2026  
> **الهدف:** إزالة كافة القيم الثابتة (Hardcoded) لمصاريف الشحن/التوصيل في المشروع (Front-end, Back-end, Dashboard)، وإتاحة واجهة تحكم في الداش بورد تمكن الأدمن من تحديد وتحديث سعر التوصيل العام للمتجر ليظهر وينعكس فورياً في سلة الشراء ومراحل الدفع والطلبات.

---

## 1. تحليل الوضع الحالي وأماكن الهارد كود (Current State Audit)

بعد الفحص الشامل لملفات المشروع، تبين وجود قيم ثابتة (Hardcoded) متفرقة في كل من الفرونت، الباك، والداش بورد:

### أ. في واجهة المتجر (Frontend - `e-commerce-Next`):
1. **`src/contexts/CartContext.tsx` (السطور 62-68 و 441):**
   - دالة `computeShipping(subtotal)` تستخدم القيمة `process.env.NEXT_PUBLIC_SHIPPING_COST_VALUE || 50`.
   - نظراً لعدم تعريف المتغير في ملف `.env`، يتم استخدام القيمة الثابتة **`50`** دائماً لأي زائر/ضيف لم يسجل دخوله.
2. **`src/components/widgets/checkout1/cart.tsx` (السطور 202-218):**
   - سطر تكلفة الشحن مكتوب هارد كود كـ `{t("free")}` (مجاني)!
   - سطر الإجمالي يحسب فقط `totalPrice` (مجموع أسعار المنتجات) متجاهلاً مصاريف الشحن نهائياً.
3. **`src/components/widgets/checkout1/shipping-method-fields.tsx`:**
   - يحتوي على خيارات وهمية هارد كود: شحن قياسي "مجاني"، وشحن سريع "35 ر.س" (مستدعاة من `messages/ar.json` السطر 140).
   - الـ Payload المرسل لإنشاء الطلب في `checkout1.tsx` لا يرسل حتى نوع الشحن للباك إند.
4. **`src/components/widgets/shopping-cart1.tsx`:**
   - يقرأ `shippingCost` من `useCart()`، لكنه للضيوف يعتمد على قيمة الـ 50 الثابتة.

### ب. في الباك إند (Backend - `e-commerce-back`):
1. **`src/module/cart/cart.service.ts` (السطور 51-54 و 435):**
   - دالة `shippingConfig()` تعتمد على `env.SHIPPING_COST_VALUE || 0`.
2. **`src/module/order/order.service.ts` (السطور 82-85 و 341):**
   - دالة `shippingConfig()` تعتمد على `env.SHIPPING_COST_VALUE || 0` أثناء حساب إجمالي الطلب وحفظ `shippingCost` و `totalAmount`.
3. **قاعدة البيانات (MongoDB):**
   - لا يوجد موديل (Model) أو كولكشن لإعدادات المتجر العامة (`Settings`)، ولا توجد أي واجهات برمجية (Endpoints) لقراءة أو تعديل تكلفة الشحن من لوحة التحكم.

### ج. في لوحة التحكم (Dashboard - `e-commerce-Dash`):
1. **القائمة الجانبية `src/layout/Menu.tsx`:**
   - لا يوجد أي تبويب أو رابط خاص بإعدادات المتجر أو تحديد سعر التوصيل.
2. **واجهة الأدمن:**
   - لا توجد شاشة أو صفحة تمكن الأدمن من قراءة سعر الشحن الحالي أو إدخال سعر جديد.
   - في شاشة عرض تفاصيل الطلب `OrderEdit.tsx`، يتم بالفعل عرض `record.shippingCost` القادم مع الطلب.

---

## 2. الهيكلية المعمارية المقترحة للحل (Proposed Architecture)

1. **قاعدة البيانات (Database - Settings Model):**
   - إنشاء كولكشن أو مستند مفرد (Singleton) في MongoDB باسم `Setting` يحتوي على:
     - `shippingCost`: رقم يمثل تكلفة التوصيل العامة للمتجر (أكبر من أو يساوي 0).
     - `shippingType`: نوع الشحن ("fixed" أو "percentage" - الافتراضي ثابت "fixed").
     - `currency`: العملة الأساسية (تطابق إعداد المتجر).
2. **واجهات الباك إند البرمجية (REST APIs):**
   - `GET /v1/settings/shipping`: عام (Public) بدون توكن، يسمح لفرونت إند المتجر بقراءة سعر الشحن الحالي فور فتح الموقع (للزائر والمسجل).
   - `PUT /v1/settings/shipping`: محمي (Protected) للأدمن فقط (`admin` و `superAdmin`) لتعديل وتحديث سعر الشحن.
   - ربط حسابات السلة (`cart.service`) وحسابات الطلبات (`order.service`) بمستند الإعدادات في قاعدة البيانات تلقائياً.
3. **واجهة لوحة التحكم (Dashboard UI):**
   - إضافة شاشة أنيقة وسهلة الاستخدام في الداش بورد باسم **"إعدادات التوصيل"** (Delivery Settings).
   - إضافة خيار في القائمة الجانبية (تحت "المبيعات" أو في قسم "الإعدادات").
   - قراءة السعر الحالي، وحقل رقمي لتعديل القيمة، وزر حفظ يعطي تأكيداً فورياً (Toast / Notification).
4. **تزامن الفرونت إند الفوري (Front-end Real-Time Sync):**
   - تحديث `CartContext` ليجلب سعر الشحن المخزن في الداتابيز عند تشغيل المتجر.
   - إزالة الـ 50 الهارد كود من الفرونت إند.
   - تحديث شاشة الـ Checkout وشاشة الـ Cart ليتم احتساب سعر التوصيل الحقيقي في الإجمالي وعرضه بوضوح.

---

## 3. تفاصيل الخطة متقسمة إلى مراحل وتاسكات (Task Breakdown)

### 📌 المرحلة الأولى: تجهيز الباك إند وقاعدة البيانات (Backend & Database)
> **الهدف:** توفير مستودع بيانات آمن لتكلفة الشحن مع توفير Endpoints للقراءة العامة والتحديث من قبل الأدمن، وربطها بعمليات السلة والطلبات.

- [x] **تاسك 1.1: إنشاء موديل الإعدادات (`Setting Model`)**
  - **الملف:** `e-commerce-back/src/database/model/setting.model.ts`
  - **المطلوب:** إنشاء Schema يحتوي على `shippingCost` (رقم >= 0)، `shippingType` (fixed / percentage)، مع دالة جلب تلقائية (إذا لم يكن هناك إعداد مسبق، يتم إنشاء الإعداد الافتراضي تلقائياً).
- [x] **تاسك 1.2: إنشاء قواعد التحقق من المدخلات (`Validation Schema`)**
  - **الملف:** `e-commerce-back/src/module/setting/setting.validate.ts`
  - **المطلوب:** استخدام Zod للتحقق من أن `shippingCost` رقم صالح ولا يقل عن صفر.
- [x] **تاسك 1.3: إنشاء خدمة الإعدادات (`Setting Service`)**
  - **الملف:** `e-commerce-back/src/module/setting/setting.service.ts`
  - **المطلوب:** 
    - دالة `getShippingSetting`: استرجاع تكلفة الشحن ونوعها وعملة المتجر.
    - دالة `updateShippingSetting`: تحديث وحفظ تكلفة الشحن في قاعدة البيانات.
    - دالة مساعدة داخلية `getEffectiveShippingConfig`: لاستخدامها من قِبل الـ Services الأخرى دون تكرار كود.
- [x] **تاسك 1.4: إنشاء المتحكم والمسارات وتوصيلها بالتطبيق (`Controller & Routes`)**
  - **الملف:** `e-commerce-back/src/module/setting/setting.controller.ts` و `e-commerce-back/src/app.controller.ts`
  - **المطلوب:**
    - تسجيل مسار `GET /v1/settings/shipping` (مفتوح للجميع).
    - تسجيل مسار `PUT /v1/settings/shipping` (يتطلب `auth` و صلاحية `allowRoles("admin", "superAdmin")`).
    - تسجيل الراوتر الرئيسي في `app.controller.ts` تحت البادئة `/v1/settings`.
- [x] **تاسك 1.5: ربط السلة والطلبات بالقيم الديناميكية**
  - **الملفات:** 
    - `e-commerce-back/src/module/cart/cart.service.ts`
    - `e-commerce-back/src/module/order/order.service.ts`
  - **المطلوب:** استبدال قراءة `env.SHIPPING_COST_VALUE` واستدعاء `getEffectiveShippingConfig()` لضمان حساب السلة والطلبات وفقاً لآخر سعر حدده الأدمن في قاعدة البيانات.
- [x] **تاسك 1.6: فحص الاختبارات وتأكيد استقرار الباك إند**
  - التأكد من عدم كسر أي اختبارات سابقة (`npm test` أو `pricing.test.ts`) والتأكد من استجابة الـ Endpoints بشكل صحيح.

---

### 📌 المرحلة الثانية: إضافة شاشة التحكم في الداش بورد (Dashboard Integration)
> **الهدف:** إضافة مكان مخصص في الداش بورد يمكن للأدمن من خلاله رؤية وتعديل قيمة التوصيل بضغطة زر.

- [x] **تاسك 2.1: إضافة نصوص الترجمة (i18n)**
  - **الملفات:**
    - `e-commerce-Dash/src/i18n/ar/index.ts` و `e-commerce-Dash/src/i18n/ar/resources.ts`
    - `e-commerce-Dash/src/i18n/en.ts`
  - **المطلوب:** إضافة النصوص والمسميات مثل: "تكلفة التوصيل"، "إعدادات الشحن"، "قيمة الشحن الحالية"، "حفظ التغييرات"، "تم تحديث تكلفة التوصيل بنجاح".
- [x] **تاسك 2.2: إنشاء شاشة إعدادات التوصيل (`ShippingSettings.tsx`)**
  - **الملف:** `e-commerce-Dash/src/settings/ShippingSettings.tsx`
  - **المطلوب:**
    - بناء واجهة متناسقة مع نمط الـ Material-UI الخاص بالداش بورد (`Card`, `CardContent`, `TextField`, `Button`, `LocalShippingOutlinedIcon`).
    - قراءة قيمة الشحن الحالية عند فتح الصفحة عبر الـ API.
    - حقل إدخال يقبل الرقم الجديد مع إظهار العملة (ر.س / ج.م).
    - زر "حفظ" يرسل التحديث للباك إند مع ظهور رسالة نجاح/تأكيد (Notification).
- [x] **تاسك 2.3: تسجيل مسار الصفحة في الداش بورد (`App.tsx`)**
  - **الملف:** `e-commerce-Dash/src/App.tsx`
  - **المطلوب:** إضافة CustomRoute لمسار `/shipping` أو `/settings` ليكون متاحاً داخل الـ React-Admin Layout.
- [x] **تاسك 2.4: إضافة الرابط في القائمة الجانبية (`Menu.tsx`)**
  - **الملف:** `e-commerce-Dash/src/layout/Menu.tsx`
  - **المطلوب:** إضافة `MenuItemLink` بأيقونة التوصيل `LocalShippingOutlinedIcon`:
    - تحت قائمة **المبيعات** بجانب "الطلبات" (وهو خيار سريع ومريح جداً للأدمن).
- [x] **تاسك 2.5: اختبار الربط بالداش بورد**
  - تجربة فحص الكود والبناء (`npm run build` أو `typecheck`) والتأكد من استقرار الداش بورد.

---

### 📌 المرحلة الثالثة: تحديث واجهة المتجر وإزالة الهارد كود (Frontend Real-Time Integration)
> **الهدف:** إزالة الـ 50 الثابتة، وربط السلة ومراحل الدفع بالقيمة القادمة من الباك إند فورياً لجميع المستخدمين.

- [x] **تاسك 3.1: تحديث `CartContext` لقراءة تكلفة الشحن ديناميكياً**
  - **الملف:** `e-commerce-front/e-commerce-Next/src/contexts/CartContext.tsx`
  - **المطلوب:**
    - حذف الـ fallback الثابت `|| 50`.
    - إضافة استدعاء لـ `GET /v1/settings/shipping` عند تحميل التطبيق (Initial mount) لتخزين قيمة الشحن المعتمدة في الـ state.
    - حساب الشحن للزائر (Guest) بناءً على هذه القيمة بدلاً من الهارد كود.
    - في حال كانت السلة فارغة (`items.length === 0`)، يتم جعل مصاريف الشحن 0.
- [x] **تاسك 3.2: تعديل شاشة السلة (`shopping-cart1.tsx`)**
  - **الملف:** `e-commerce-front/e-commerce-Next/src/components/widgets/shopping-cart1.tsx`
  - **المطلوب:** التأكد من قراءة القيمة الحقيقية وتنسيقها بشكل سليم (عرض "مجاني" فقط في حال كانت القيمة 0، وإلا عرض المبلغ المحدث).
- [x] **تاسك 3.3: إصلاح وتحديث شاشة إتمام الطلب (`checkout1/cart.tsx`)**
  - **الملف:** `e-commerce-front/e-commerce-Next/src/components/widgets/checkout1/cart.tsx`
  - **المطلوب:**
    - حذف الهارد كود `{t("free")}` من ملخص السلة في صفحة الـ Checkout.
    - قراءة `shippingCost` من `useCart()`.
    - تحديث سطر الإجمالي (Total) ليحسب `totalPrice + shippingCost` بشكل صحيح ودقيق بدلاً من احتساب مجموع المنتجات فقط.
- [x] **تاسك 3.4: تنظيف خيارات الشحن في صفحة الشراء (`shipping-method-fields.tsx`)**
  - **الملف:** `e-commerce-front/e-commerce-Next/src/components/widgets/checkout1/shipping-method-fields.tsx`
  - **المطلوب:** 
    - مواءمة خيار الشحن لعرض قيمة التوصيل الحقيقية المعتمدة للمتجر، وإزالة الخيارات الوهمية الهارد كود (مثل "35 ر.س" الثابتة).
- [x] **تاسك 3.5: مراجعة صفحة تأكيد الطلب (`order/page.tsx`)**
  - التأكد من أن تكلفة الشحن والإجمالي النهائي المعروض للمستخدم يطابق تماماً ما تم احتسابه وحفظه في الطلب بالباك إند.

---

### 📌 المرحلة الرابعة: الاختبار الشامل والتأكد من تدفق البيانات (End-to-End Verification)
> **الهدف:** التأكد من أن التعديل في لوحة التحكم ينعكس فورياً في الفرونت إند والطلبات دون أي خلل.

- [x] **تاسك 4.1: فحص التعديل من لوحة التحكم**
  - تسجيل الدخول كأدمن -> الدخول إلى صفحة التوصيل -> تغيير القيمة (مثلاً من 50 إلى 70) -> حفظ.
- [x] **تاسك 4.2: التحقق من التحديث الفوري في المتجر (Frontend)**
  - فتح المتجر كزائر (Guest) وإضافة منتج إلى السلة -> التأكد من ظهور تكلفة الشحن 70.
  - الدخول إلى صفحة الدفع (Checkout) -> التأكد من ظهور 70 وأن الإجمالي = المنتجات + 70.
- [x] **تاسك 4.3: إنشاء طلب واختبار قاعدة البيانات**
  - إتمام الطلب واختيار الدفع عند الاستلام (COD) -> التحقق من شاشة التأكيد.
  - فتح تفاصيل الطلب في لوحة التحكم (`Orders`) والتأكد من تسجيل `shippingCost: 70` والإجمالي مطابق بدقة.
- [x] **تاسك 4.4: اختبار حالة الشحن المجاني (0)**
  - تعديل القيمة في الداش بورد لتصبح 0 -> التأكد من ظهور كلمة "مجاني" في السلة والـ Checkout وأن الإجمالي يساوي فقط قيمة المنتجات.

---

## 4. قائمة الملفات التي تم إنشاؤها وتعديلها (File Checklist)

### ملفات جديدة تم إنشاؤها:
1. `e-commerce-back/src/database/model/setting.model.ts` *(موديل قاعدة البيانات)*
2. `e-commerce-back/src/module/setting/setting.validate.ts` *(التحقق من صحة المدخلات)*
3. `e-commerce-back/src/module/setting/setting.validate.test.ts` *(اختبارات الوحدة للتحقق)*
4. `e-commerce-back/src/module/setting/setting.service.ts` *(منطق الأعمال وجلب وتحديث الشحن)*
5. `e-commerce-back/src/module/setting/setting.controller.ts` *(مسارات الـ API)*
6. `e-commerce-Dash/src/settings/ShippingHeader.tsx` *(مكون رأس الصفحة والعنوان والأيقونة)*
7. `e-commerce-Dash/src/settings/CurrentRateCard.tsx` *(مكون عرض القيمة الحالية المعتمدة)*
8. `e-commerce-Dash/src/settings/ShippingRateForm.tsx` *(مكون حقل الإدخال وزر الحفظ والتنبيهات)*
9. `e-commerce-Dash/src/settings/ShippingSettings.tsx` *(الصفحة الرئيسية التي تجمع المكونات الصغيرة)*
10. `e-commerce-Dash/src/settings/index.ts` *(نقطة التصدير النظيفة للداش بورد)*

### ملفات تم تعديلها:
1. `e-commerce-back/src/app.controller.ts` *(تسجيل راوتر الإعدادات)*
2. `e-commerce-back/src/module/cart/cart.service.ts` *(استبدال الهارد كود باستدعاء الإعدادات الديناميكية)*
3. `e-commerce-back/src/module/order/order.service.ts` *(استبدال الهارد كود باستدعاء الإعدادات الديناميكية)*
4. `e-commerce-Dash/src/App.tsx` *(تسجيل المسار المخصص)*
5. `e-commerce-Dash/src/layout/Menu.tsx` *(إضافة رابط تكلفة التوصيل في القائمة)*
6. `e-commerce-Dash/src/i18n/ar/index.ts` & `en.ts` *(إضافة نصوص الترجمة)*
7. `e-commerce-front/e-commerce-Next/src/contexts/CartContext.tsx` *(جلب الشحن ديناميكياً وإزالة الـ 50)*
8. `e-commerce-front/e-commerce-Next/src/components/widgets/checkout1/cart.tsx` *(إزالة هارد كود "مجاني" وحساب الإجمالي شاملاً الشحن)*
9. `e-commerce-front/e-commerce-Next/src/components/widgets/checkout1/shipping-method-fields.tsx` *(مواءمة نصوص وقيم الشحن)*

