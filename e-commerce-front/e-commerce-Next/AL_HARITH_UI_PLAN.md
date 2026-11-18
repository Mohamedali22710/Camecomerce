# 🏗️ خطة تحويل UI — الحارث الذكي
> متجر كاميرات المراقبة | Al-Harith Al-Dhaki CCTV Store

**القاعدة الصارمة لكل تاسك:**
- نفس هيكل المشروع الحالي (component per file, folder per widget)
- لا تعديل على الباك إند
- لا تعديل على الداش بورد
- كل تاسك مبني على اللي قبله
- Dark/Light mode محتفظ بيه

---

## مراجعة الباك إند قبل البدء

| السؤال | الإجابة |
|--------|---------|
| هل الـ signup بيقبل name? | لا - الـ name بيتعمل تلقائيا email.split("@")[0] |
| هل بيقبل phone? | نعم - phone: req.body.phone || null |
| هل بيقبل email + password + confirmPassword? | نعم |

---

## PHASE 1 - Design Tokens & Global Styles

### TASK 1.1 - تحديث CSS Variables في globals.css
الملف: src/app/globals.css
التغييرات:
- تغيير --primary من #FF7483 الى #2563EB
- تغيير --ring من #FF7483 الى #2563EB
- إضافة Brand Tokens:
  --brand-navy: #101D35
  --brand-navy-soft: #1B2B49
  --brand-blue: #2563EB
  --brand-orange: #F59E0B
- تحديث Dark mode variables
- إزالة @font-face لـ GFS Didot

### TASK 1.2 - تحديث الخطوط في layout.tsx
الملف: src/app/layout.tsx
التغييرات:
- إضافة next/font/google لجلب IBM_Plex_Sans_Arabic و Inter
- إزالة localFont لـ Montserrat
- تحديث className على html

### TASK 1.3 - تحديث Metadata في layout.tsx
الملف: src/app/layout.tsx
التغييرات:
- title: "الحارث الذكي - كاميرات المراقبة"
- description مناسبة للمتجر
- يتم بعد TASK 1.2

---

## PHASE 2 - Navbar

### TASK 2.1 - إنشاء top-utility-bar.tsx
الملف الجديد: src/components/widgets/top-utility-bar.tsx
المحتوى:
- شريط ضيق بخلفية #101D35
- يمين: رقم تواصل placeholder
- يسار: عملة SAR
- Height 36px - يختفي على موبايل

### TASK 2.2 - تحديث navbar1.tsx
الملف: src/components/widgets/navbar1.tsx
التغييرات:
- إضافة TopUtilityBar فوق الـ nav
- logo.src default = "/logo.png"
- logo.title default = "الحارث الذكي"
- sticky top-0 z-50 shadow-sm
- الحفاظ على كل logic بدون تغيير
- يتم بعد TASK 2.1

---

## PHASE 3 - Homepage

### TASK 3.1 - إنشاء hero-section.tsx
الملف الجديد: src/components/widgets/home/hero-section.tsx
المحتوى:
- خلفية gradient navy #101D35 الى #1B2B49
- img placeholder /hero-cctv.jpg
- عنوان: "حماية ذكية تبدأ بالاختيار الصحيح"
- وصف: "اكتشف حلول المراقبة والأمان المناسبة لمنزلك أو منشأتك"
- CTA رئيسي: زر أزرق /products - "تسوق المنتجات"
- CTA ثانوي: outline /categories - "اكتشف حلول الحماية"
- animations بـ framer-motion

### TASK 3.2 - إنشاء category-grid-section.tsx
الملف الجديد: src/components/widgets/home/category-grid-section.tsx
المحتوى:
- نقل منطق جلب الكاتيجوريز من page.tsx
- نفس animations (fadeInUp, stagger)
- gradient overlay navy على الصور
- hover: scale 1.05
- Props: categories: Category[], locale: Locale

### TASK 3.3 - إنشاء featured-products-section.tsx
الملف الجديد: src/components/widgets/home/featured-products-section.tsx
المحتوى:
- يجلب من /product API
- يعرض أول 8 منتجات
- يستخدم ProductCardCctv (Phase 4)
- عنوان: "المنتجات المميزة"

### TASK 3.4 - إنشاء trust-badges-section.tsx
الملف الجديد: src/components/widgets/home/trust-badges-section.tsx
المحتوى:
- 4 badges افقية على #F7F8FA
- شحن سريع / ضمان الجودة / دعم فني / خدمة التركيب
- أيقونات من lucide-react
- كلها placeholder - لا claims حقيقية

### TASK 3.5 - إنشاء home/index.ts
الملف الجديد: src/components/widgets/home/index.ts
export للـ 4 sections

### TASK 3.6 - تحديث page.tsx
الملف: src/app/page.tsx
التغييرات:
- استيراد sections الجديدة
- حذف sections الملابس (men1, women1, kids1, offer.jpg)
- حذف GFS Didot references
- حذف منطق جلب الكاتيجوريز (انتقل لـ category-grid-section)
- يتم بعد TASK 3.1 الى 3.5

---

## PHASE 4 - Product Card CCTV

### TASK 4.1 - إنشاء types.ts
الملف الجديد: src/components/widgets/product-card-cctv/types.ts
interface CCTVProduct مع الـ fields من الـ schema

### TASK 4.2 - إنشاء product-card-cctv.tsx
الملف الجديد: src/components/widgets/product-card-cctv/product-card-cctv.tsx
المحتوى:
- Dynamic props - يستقبل CCTVProduct
- اسم محلي بـ getLocalizedField
- سعر SAR مع خصم
- Wishlist toggle بـ WishlistContext
- زر "أضف للسلة" بـ CartContext
- Badge برتقالي للخصم

### TASK 4.3 - إنشاء product-card-cctv/index.ts
export للـ component والـ types

---

## PHASE 5 - Auth Pages

### TASK 5.1 - إنشاء auth-card-wrapper.tsx
الملف الجديد: src/components/widgets/auth/auth-card-wrapper.tsx
المحتوى:
- Wrapper مشترك بين Login و Signup
- يعرض Logo + اسم + tagline + children
- خلفية navy gradient
- الكرت أبيض radius 16px

### TASK 5.2 - تحديث login1.tsx
الملف: src/components/widgets/login1.tsx
التغييرات:
- إحاطة المحتوى بـ AuthCardWrapper
- الحفاظ الكامل على Zod schema والـ logic
- يتم بعد TASK 5.1

### TASK 5.3 - تحديث signup1.tsx
الملف: src/components/widgets/signup1.tsx
التغييرات:
- AuthCardWrapper
- إضافة phone field (optional)
- لا إضافة لـ name - الباك إند يعمله تلقائيا
- يتم بعد TASK 5.1

---

## PHASE 6 - Footer

### TASK 6.1 - تحديث types.ts في footer
الملف: src/components/widgets/ecommerce-footer1/types.ts
تحديث الروابط الافتراضية لكاميرات المراقبة

### TASK 6.2 - تحديث ecommerce-footer1.tsx
الملف: src/components/widgets/ecommerce-footer1/ecommerce-footer1.tsx
التغييرات:
- Copyright = "2026 الحارث الذكي. جميع الحقوق محفوظة."
- logo.jpg -> logo.png
- حذف AMEX و PayPal - إبقاء Visa
- يتم بعد TASK 6.1

---

## PHASE 7 - i18n

### TASK 7.1 - مراجعة messages/ files
لا حذف لأي key موجودة

### TASK 7.2 - إضافة keys Hero Section
messages/ar.json + en.json + fr.json
heroTitle, heroSubtitle, heroCta, heroCta2, featuredTitle, trust badges keys

### TASK 7.3 - إضافة keys Footer
copyright و slogan في footer namespace

---

## PHASE 8 - نهائيات

### TASK 8.1 - مراجعة RTL في الـ components الجديدة
التحقق من Hero / Category / Product Card / Auth / Footer

### TASK 8.2 - مراجعة Dark Mode
التأكد من استخدام CSS variables بدل hardcoded colors

### TASK 8.3 - Public Assets
- logo.jpg -> logo.png (يضيفه العميل)
- إضافة placeholder hero-cctv.jpg
- تحديث favicon reference

### TASK 8.4 - اختبار أولي
npm run dev - التحقق من primary color, fonts, RTL, Navbar, Hero, Categories, Auth

---

## ملخص التاسكات

| Phase | Tasks | ملفات جديدة | ملفات معدلة |
|-------|-------|-------------|-------------|
| 1 Tokens | 1.1, 1.2, 1.3 | - | globals.css, layout.tsx |
| 2 Navbar | 2.1, 2.2 | top-utility-bar.tsx | navbar1.tsx |
| 3 Homepage | 3.1 -> 3.6 | home x4 + index.ts | page.tsx |
| 4 ProductCard | 4.1, 4.2, 4.3 | product-card-cctv x3 | - |
| 5 Auth | 5.1, 5.2, 5.3 | auth-card-wrapper.tsx | login1.tsx, signup1.tsx |
| 6 Footer | 6.1, 6.2 | - | types.ts, footer.tsx |
| 7 i18n | 7.1, 7.2, 7.3 | - | messages/*.json |
| 8 Final | 8.1 -> 8.4 | - | مراجعة عامة |

الإجمالي: 20 تاسك - 9 ملفات جديدة - 10 ملفات معدلة

---

## ثوابت لا تمس ابدا

- e-commerce-back/ كله
- e-commerce-Dash/ كله
- Zod schemas في login1/signup1
- CartContext / WishlistContext / UserContext
- Google OAuth logic
- API endpoints و lib/api.ts
- next-intl routing
