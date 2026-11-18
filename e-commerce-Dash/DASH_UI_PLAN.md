# 🛡️ خطة تحويل UI — لوحة تحكم الحارث الذكي
> Dashboard Admin Panel | React-Admin + MUI + Vite

**القاعدة الصارمة لكل تاسك:**
- نفس هيكل المشروع الحالي (نفس الملفات والفولدرات الموجودة)
- لا تعديل على الباك إند (`e-commerce-back/`) خالص
- لا تعديل على الفرونت (`e-commerce-front/`) خالص
- كل تاسك مبني على اللي قبله
- RTL/LTR محتفظ بيه (الداش بورد عنده RTLWrapper شغال)
- Dark/Light mode محتفظ بيه
- الـ Logic والـ dataProvider والـ authProvider لا يتلمسوا

---

## مراجعة الوضع الحالي

| الملف | الوضع الحالي | المشكلة |
|-------|-------------|---------|
| `softTheme.ts` | primary = `#FF7483` (وردي) | مش متوافق مع السيستم ديزاين |
| `Login.tsx` | gradient بوردي وأزرق غامق | مش متوافق مع البراند |
| `Welcome.tsx` | buttons بتلينك لـ react-admin demo | يجب استبدالها بروابط المتجر |
| `AppBar.tsx` | شغال بس بدون هوية بصرية | يحتاج Logo + ألوان |
| `AppBarToolbar.tsx` | LocalesMenuButton + LoadingIndicator فقط | يحتاج ThemeToggle |
| `softTheme.ts` | Montserrat font | يجب استبدالها بـ IBM Plex Sans Arabic / Inter |
| Dashboard cards | CardWithIcon: circle background بـ secondary.main | يحتاج ألوان البراند |

---

## PHASE 1 — Design Tokens (الثيم الجديد)

### TASK 1.1 — إنشاء ملف `brandTheme.ts`
**الملف الجديد:** `src/themes/brandTheme.ts`

إنشاء ثيم جديد بالكامل مبني على Design System بتاع المشروع:

```ts
// Light Theme
brandLightTheme = {
  palette: {
    primary:   { main: '#2563EB' },          // brand.blue
    secondary: { main: '#101D35', light: '#1B2B49', dark: '#0A1525' }, // brand.navy
    success:   { main: '#16A34A' },
    warning:   { main: '#D97706' },
    error:     { main: '#DC2626' },
    background:{ default: '#F7F8FA', paper: '#FFFFFF' },
    text:      { primary: '#172033', secondary: '#667085' },
    divider:   '#E5E7EB',
    // Orange highlight (sparse): #F59E0B
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: "'IBM Plex Sans Arabic', 'Inter', sans-serif",
    // scale موحد: display, h1-h3, body, caption, helper
  },
  sidebar: { width: 220 },
  components: {
    // AppBar: white bg + navy text
    // Sidebar: navy bg + white text
    // Active menu item: brand.blue indicator
    // Cards: border #E5E7EB, no boxShadow
    // Buttons: radius 8-12px
    // DataGrid rows: hover bg F7F8FA
    // RaMenuItemLink: active border brand.blue
    // RaToolbar: bg #F7F8FA
  }
}

// Dark Theme  
brandDarkTheme = {
  palette: {
    primary:    { main: '#3B82F6' },        // أفتح قليلاً للـ dark mode
    secondary:  { main: '#1B2B49' },
    background: { default: '#0F172A', paper: '#1E293B' },
    text:       { primary: '#F1F5F9', secondary: '#94A3B8' },
  },
  // باقي الـ overrides
}
```

**يتم قبل:** TASK 1.2

---

### TASK 1.2 — إضافة `brand` للـ themes registry
**الملف المُعدَّل:** `src/themes/themes.tsx`

```ts
import { brandLightTheme, brandDarkTheme } from './brandTheme';
// إضافة:
{ name: 'brand', light: brandLightTheme, dark: brandDarkTheme }
```

وتغيير `defaultTheme` في `App.tsx` من `"soft"` إلى `"brand"`.

**ثوابت لا تتغير:** باقي الثيمات (soft, B&W, nano, radiant, house, chiptune, cssVariables) تفضل موجودة

**يتم بعد:** TASK 1.1

---

### TASK 1.3 — تحديث default store key في `App.tsx`
**الملف المُعدَّل:** `src/App.tsx`

السطر الوحيد اللي بيتغير:
```ts
const [themeName] = useStore<ThemeName>('themeName', 'brand'); // كان 'soft'
```
وكمان `defaultTheme="light"` يفضل كما هو.

**يتم بعد:** TASK 1.2

---

## PHASE 2 — Layout & Login

### TASK 2.1 — تحديث `Login.tsx`
**الملف المُعدَّل:** `src/layout/Login.tsx`

التغييرات:
- استبدال الـ gradient الوردي بـ navy gradient:
  ```ts
  background: 'linear-gradient(135deg, #101D35 0%, #1B2B49 60%, #2563EB 100%)'
  ```
- إضافة Logo + اسم "لوحة التحكم" فوق الـ LoginForm
- إضافة `sx` للـ LoginForm: border-radius 16px, card أبيض / dark-mode #1E293B
- الـ motion animation يفضل كما هو

**الـ Logic:** لا يتغير — نفس `RaLogin + LoginForm`

---

### TASK 2.2 — تحديث `Logo.tsx`
**الملف المُعدَّل:** `src/layout/Logo.tsx`

- تغيير النص / صورة اللوجو لـ "الحارث الذكي" بأيقونة كاميرا مراقبة (Lucide/MUI icon)
- يستخدم `brand.navy` كلون أساسي للـ logo text
- محافظ على نفس هيكل الكومبوننت

---

### TASK 2.3 — تحديث `AppBar.tsx`
**الملف المُعدَّل:** `src/layout/AppBar.tsx`

- AppBar يستخدم `color="inherit"` بدل `color="secondary"` (عشان الثيم الجديد يتطبق صح)
- إضافة `elevation={0}` + `sx={{ borderBottom: '1px solid', borderColor: 'divider' }}`
- يفضل Logo + TitlePortal كما هو

---

### TASK 2.4 — تحديث `AppBarToolbar.tsx`
**الملف المُعدَّل:** `src/layout/AppBarToolbar.tsx`

إضافة `ThemeSwapper` button (موجود بالفعل في `src/themes/ThemeSwapper.tsx`):
```tsx
import { ThemeSwapper } from '../themes/ThemeSwapper';
export const AppBarToolbar = () => (
  <>
    <ThemeSwapper />
    <LocalesMenuButton />
    <LoadingIndicator />
  </>
);
```
**يتم بعد:** TASK 2.3

---

### TASK 2.5 — تحديث `Menu.tsx`
**الملف المُعدَّل:** `src/layout/Menu.tsx`

- لا تغيير في الـ structure أو الـ logic
- فقط إضافة `sx` على الـ Box الخارجي:
  ```ts
  sx={{
    bgcolor: 'secondary.main',   // navy sidebar
    minHeight: '100%',
    '& .MuiTypography-root': { color: 'white' },
    '& svg': { color: 'white' },
  }}
  ```
- وتعديل الـ active item في الثيم (عبر `brandTheme.ts`) مش هنا

> [!NOTE]
> الـ RTLWrapper موجود في `Layout.tsx` وبيغطي كل حاجة — مش هنلمسه

---

## PHASE 3 — Dashboard Page

### TASK 3.1 — تحديث `Welcome.tsx`
**الملف المُعدَّل:** `src/dashboard/Welcome.tsx`

التغييرات:
- تغيير الـ gradient:
  ```ts
  background: 'linear-gradient(135deg, #101D35 0%, #1B2B49 60%, #2563EB 100%)'
  ```
- تغيير النصوص (عبر i18n keys — مش hardcoded):
  - `welcome.title` → "مرحباً بك في لوحة تحكم الحارث الذكي"
  - `welcome.subtitle` → "إدارة المنتجات والطلبات والمستخدمين من مكان واحد"
- استبدال الزرين (react-admin site + demo) بـ:
  - زر أزرق: رابط `/orders` — "الطلبات الجديدة"
  - زر outline أبيض: رابط `/products` — "إدارة المنتجات"
- الـ motion animation يفضل كما هو
- الـ welcome_illustration.svg يفضل أو يتغير لصورة أنسب

**يتم بعد:** TASK 1.1 (عشان يستخدم الألوان الجديدة)

---

### TASK 3.2 — تحديث `CardWithIcon.tsx`
**الملف المُعدَّل:** `src/dashboard/CardWithIcon.tsx`

- الـ circle background (`:before`): يستخدم `primary.main` بدل `secondary.main`
- الـ icon color: `primary.main` بدل `secondary.main`
- إضافة border-radius 12px على الـ Card
- إضافة `borderLeft: '4px solid'` + `borderColor: 'primary.main'` كـ accent

---

### TASK 3.3 — تحديث `MonthlyRevenue.tsx` و `NbNewOrders.tsx`
**الملفات المُعدَّلة:**
- `src/dashboard/MonthlyRevenue.tsx`
- `src/dashboard/NbNewOrders.tsx`

تغيير icon colors لـ `primary.main` (brand.blue `#2563EB`) عوض الـ default.
إضافة `sx` للـ typography الأرقام: `fontSize: { xs: '1.5rem', md: '2rem' }, fontWeight: 700`.

---

### TASK 3.4 — تحديث `PendingOrders.tsx` و `PendingOrder.tsx`
**الملفات المُعدَّلة:**
- `src/dashboard/PendingOrders.tsx`
- `src/dashboard/PendingOrder.tsx`

- تغيير status chip colors:
  - `pending` → `warning.main` (#D97706)
  - `processing` → `primary.main` (#2563EB)
  - `shipped` → `secondary.main` (#1B2B49)
  - `delivered` → `success.main` (#16A34A)
  - `cancelled` → `error.main` (#DC2626)
- إضافة Avatar بأيقونة order بدل text avatar

---

## PHASE 4 — Products Module

### TASK 4.1 — تحديث `ProductList.tsx`
**الملف المُعدَّل:** `src/products/ProductList.tsx`

- إضافة `sx` على الـ Datagrid: `borderRadius: 2, overflow: 'hidden'`
- تغيير صورة المنتج: border-radius 8px بدل 4px + object-fit: contain
- إضافة colored chip للـ `isActive`:
  - true → Chip أخضر "نشط"
  - false → Chip أحمر "معطل"
  بدل BooleanField
- إضافة `FunctionField` للسعر بعد الخصم جنب السعر الأصلي (line-through)
- تحديث `ListActions`: إضافة `sx` على CreateButton لاستخدام brand.blue

---

### TASK 4.2 — تحديث `GridList.tsx`
**الملف المُعدَّل:** `src/products/GridList.tsx`

- Card radius: 12px
- Image: aspect-ratio 4/3, object-fit: cover
- Discount badge: Chip برتقالي (`#F59E0B`) في الكونر العلوي
- hover: scale 1.02 مع framer-motion (موجود في الكودبيس)
- Status indicator: نقطة خضراء/حمراء في الكونر

---

### TASK 4.3 — تحديث `ProductCreate.tsx` و `ProductEdit.tsx`
**الملفات المُعدَّلة:**
- `src/products/ProductCreate.tsx`
- `src/products/ProductEdit.tsx`

- إضافة header section: اسم المنتج كـ H2 + breadcrumb
- Section headers بـ Typography variant="h6" + divider فاصل
- Form sections في cards منفصلة: معلومات أساسية / الصور / الـ Variants
- إضافة `sx` للـ SimpleForm: gap بين الـ fields

---

### TASK 4.4 — تحديث `VariantsEditor.tsx`
**الملف المُعدَّل:** `src/products/VariantsEditor.tsx`

- Color swatches (دوائر ملونة) بدل text فقط
- Table headers بـ brand.navy لون
- Add button: brand.blue

---

## PHASE 5 — Orders Module

### TASK 5.1 — تحديث `OrderList.tsx`
**الملف المُعدَّل:** `src/orders/OrderList.tsx`

- استبدال SelectField للـ statuses بـ Chips ملونة (`FunctionField`):
  - `orderStatus`:
    - pending → Chip أصفر
    - processing → Chip أزرق
    - shipped → Chip navy
    - delivered → Chip أخضر
    - cancelled → Chip أحمر
  - `paymentStatus`:
    - pending → Chip رمادي
    - paid → Chip أخضر
    - failed → Chip أحمر
  - `paymentMethod`:
    - cod → Chip رمادي "نقداً"
    - card → Chip أزرق "بطاقة"
- إضافة فلتر `orderStatus` و `paymentStatus` في `ordersFilters`
- إضافة `DateField` بشكل أوضح

---

### TASK 5.2 — تحديث `OrderEdit.tsx`
**الملف المُعدَّل:** `src/orders/OrderEdit.tsx`

- Section: معلومات الطلب (order info card)
- Section: عنوان الشحن (parsed من JSON)
- Section: المنتجات (parsed من items JSON)
- Section: تحديث الحالة (SelectInput للـ orderStatus + paymentStatus)
- Status chips ملونة كما في TASK 5.1
- الـ Logic لا يتغير

---

## PHASE 6 — Categories & Subcategories

### TASK 6.1 — تحديث `CategoryList.tsx`
**الملف المُعدَّل:** `src/categories/CategoryList.tsx`

- إضافة صورة الكاتيجوري في الـ Datagrid (50×50 avatar)
- Status chip ملون
- الـ 3 أسماء (EN/AR/FR) في أعمدة منفصلة واضحة

---

### TASK 6.2 — تحديث `CategoryCreate.tsx` و `CategoryEdit.tsx`
**الملفات المُعدَّلة:**
- `src/categories/CategoryCreate.tsx`
- `src/categories/CategoryEdit.tsx`

- Form sections منظمة
- Image upload preview قبل الحفظ
- الـ 3 languages في section واضحة

---

### TASK 6.3 — تحديث `SubcategoryList.tsx`
**الملف المُعدَّل:** `src/subcategories/SubcategoryList.tsx`

- مشابه لـ CategoryList
- إضافة column الـ parent category مع link

---

## PHASE 7 — Users Module

### TASK 7.1 — تحديث `UserList.tsx`
**الملف المُعدَّل:** `src/users/UserList.tsx`

- Avatar دائري للمستخدم (imageURL أو initials)
- Role chip:
  - `admin` → Chip أزرق
  - `superAdmin` → Chip navy
  - `user` → Chip رمادي
- Status:
  - `isActive: true` → Chip أخضر
  - `isActive: false` → Chip أحمر
  - `isBlocked: true` → Chip أحمر + أيقونة lock

---

## PHASE 8 — i18n Updates

### TASK 8.1 — تحديث `src/i18n/en.ts`
تغيير الـ keys الخاصة بالـ dashboard welcome:
```ts
welcome: {
  title: 'Welcome to Al-Harith Smart Dashboard',
  subtitle: 'Manage your CCTV store products, orders, and users from one place.',
  ra_button: 'View Orders',
  demo_button: 'Manage Products',
}
```

---

### TASK 8.2 — تحديث `src/i18n/ar/resources.ts`
تعريب نفس الـ keys:
```ts
welcome: {
  title: 'مرحباً بك في لوحة تحكم الحارث الذكي',
  subtitle: 'إدارة منتجات الكاميرات والطلبات والمستخدمين من مكان واحد.',
  ra_button: 'عرض الطلبات',
  demo_button: 'إدارة المنتجات',
}
```

---

### TASK 8.3 — تحديث `src/i18n/fr.ts`
نفس الـ keys بالفرنسية.

---

## PHASE 9 — نهائيات وجودة

### TASK 9.1 — مراجعة RTL في الثيم الجديد
**الملف:** `src/layout/RTLWrapper.tsx`
- التأكد إن الـ `direction: 'rtl'` بيتطبق صح مع الثيم الجديد
- التأكد إن `borderInlineStart` بيشتغل في الـ menu items

---

### TASK 9.2 — مراجعة Dark Mode
- التأكد إن كل الألوان الجديدة في الـ components بتستخدم `theme.palette.*` مش hardcoded
- مراجعة Login gradient في الـ dark mode
- مراجعة Sidebar في الـ dark mode

---

### TASK 9.3 — مراجعة Responsive
- Dashboard cards على mobile: stack vertically
- Sidebar: تتلوى صح عند الـ collapse
- Order chips: لا overflow

---

### TASK 9.4 — اختبار أولي
```bash
npm run dev
```
التحقق من:
- [ ] Login page بالألوان الجديدة
- [ ] AppBar: Logo + Theme toggle + Language toggle
- [ ] Sidebar: Navy background + white text
- [ ] Dashboard: Welcome card navy + الكارت الجديد
- [ ] Products: Chips للـ status + صورة أوضح
- [ ] Orders: Status chips ملونة
- [ ] Dark mode يشتغل
- [ ] RTL يشتغل باللغة العربية

---

## ملخص التاسكات

| Phase | Tasks | ملفات جديدة | ملفات معدلة |
|-------|-------|------------|------------|
| 1 Tokens | 1.1, 1.2, 1.3 | `brandTheme.ts` | `themes.tsx`, `App.tsx` |
| 2 Layout | 2.1, 2.2, 2.3, 2.4, 2.5 | - | `Login.tsx`, `Logo.tsx`, `AppBar.tsx`, `AppBarToolbar.tsx`, `Menu.tsx` |
| 3 Dashboard | 3.1, 3.2, 3.3, 3.4 | - | `Welcome.tsx`, `CardWithIcon.tsx`, `MonthlyRevenue.tsx`, `NbNewOrders.tsx`, `PendingOrders.tsx`, `PendingOrder.tsx` |
| 4 Products | 4.1, 4.2, 4.3, 4.4 | - | `ProductList.tsx`, `GridList.tsx`, `ProductCreate.tsx`, `ProductEdit.tsx`, `VariantsEditor.tsx` |
| 5 Orders | 5.1, 5.2 | - | `OrderList.tsx`, `OrderEdit.tsx` |
| 6 Categories | 6.1, 6.2, 6.3 | - | `CategoryList.tsx`, `CategoryCreate.tsx`, `CategoryEdit.tsx`, `SubcategoryList.tsx` |
| 7 Users | 7.1 | - | `UserList.tsx` |
| 8 i18n | 8.1, 8.2, 8.3 | - | `en.ts`, `ar/resources.ts`, `fr.ts` |
| 9 Final | 9.1 → 9.4 | - | مراجعة عامة |

**الإجمالي: 24 تاسك — 1 ملف جديد — 23 ملف معدَّل**

---

## ثوابت لا تُمس أبداً

- `e-commerce-back/` كله خالص
- `e-commerce-front/` كله
- `src/dataProvider/` — كل الـ API calls
- `src/authProvider.ts` — كل الـ auth logic
- `src/auth.ts`
- `src/context/AuthContext.tsx`
- `src/layout/RTLWrapper.tsx` — الـ wrapper شغال
- `src/layout/SubMenu.tsx` — منطق الـ submenu
- `src/categories/LinkToRelatedProducts.tsx`
- `src/products/SubcategoryInput.tsx` — منطق الـ reference
- `src/products/Aside.tsx`
- `src/subcategories/GroupDeleteButton.tsx`
- `src/components/ViewToggle.tsx`
- الـ i18n routing وكل الـ keys الموجودة (نضيف فقط مش نحذف)

---

## ملاحظات تقنية مهمة

> [!IMPORTANT]
> الداش بورد بيستخدم **React-Admin + MUI**، كل التغييرات بتتم عبر:
> 1. **الثيم** (`brandTheme.ts`) للألوان والشكل العام
> 2. **sx prop** في الكومبوننتس للتفاصيل
> 3. **FunctionField** لعرض البيانات بشكل مختلف (Chips بدل SelectField)

> [!NOTE]
> `imageURLs`, `colorImages`, `variants`, `items`, `shippingAddress` في الـ API كلها **JSON strings** — الـ dataProvider بيتعامل معاها، احنا بس بنعرضها

> [!TIP]
> ترتيب التنفيذ المقترح: Phase 1 (الثيم الجديد) أهم حاجة تتعمل الأول لأن كل اللي بعده بيعتمد عليها

> [!WARNING]
> `ThemeName` type في `themes.tsx` لازم تضيفيه قبل ما تضيف `brand` للـ themes array، وإلا TypeScript هيدي error
