# S Plus --- Design System & Initial UI Brief

**Project:** Saudi CCTV & Security E-commerce\
**Scope of this phase:** Design system, Homepage, Login, Sign-up, and
Google Sign-In\
**Status:** Design specification only. Do not modify backend code or
install packages yet.

------------------------------------------------------------------------

## 1. Product direction

Build an original, premium Saudi e-commerce experience for CCTV cameras
and security solutions. Use the supplied S Plus, Silken, and Al-Kifah
references as inspiration for information hierarchy and shopping UX, but
do not copy their layouts or branding.

The store should feel: - Trustworthy, technically knowledgeable, and
premium. - Easy to navigate for both technically knowledgeable buyers
and first-time buyers. - Focused on products and solutions, not like a
generic SaaS dashboard. - Optimized for Arabic-first shopping in Saudi
Arabia.

**Primary locale:** Arabic (RTL)\
**Additional locales:** English and French (LTR when selected)\
**Currency display:** SAR (ريال سعودي)\
**Responsive targets:** 1440px desktop, 1280px laptop, 768px tablet,
390px mobile.

Do not invent claims such as certifications, warranties, delivery times,
payment providers, installation coverage, or customer ratings. Use
editable content placeholders until the business confirms them.

## 2. Brand and visual direction

### Design personality

Premium Security Technology: confident, clean, modern, precise, and
approachable.

### Color tokens

  Token              Hex         Usage
  ------------------ ----------- -------------------------------------------
  `brand.navy`       `#101D35`   Brand foundation, header, dark sections
  `brand.navySoft`   `#1B2B49`   Secondary dark surfaces
  `brand.blue`       `#2563EB`   Primary actions, links, selected controls
  `brand.orange`     `#F59E0B`   Selective highlights, promotions
  `surface.page`     `#F7F8FA`   Main page background
  `surface.card`     `#FFFFFF`   Cards, forms, panels
  `text.primary`     `#172033`   Main text
  `text.secondary`   `#667085`   Supporting text
  `border.default`   `#E5E7EB`   Dividers and input borders
  `state.success`    `#16A34A`   Success states
  `state.warning`    `#D97706`   Warning states
  `state.error`      `#DC2626`   Error states

Use orange sparingly. Avoid overusing gradients, glassmorphism, heavy
shadows, and decorative animation.

### Typography

-   Arabic: IBM Plex Sans Arabic or Cairo.
-   English/French: Inter.
-   Establish a consistent scale for display, H1, H2, H3, body, caption,
    and helper text.
-   Use comfortable Arabic line-height and avoid tightly packed text.

### Spacing and shape

-   Base spacing unit: 4px.
-   Use a consistent spacing scale: 4, 8, 12, 16, 24, 32, 40, 48, 64.
-   Card radius: 12--16px.
-   Input/button radius: 8--12px.
-   Use subtle borders and restrained shadows.
-   Maintain a consistent content max-width and grid.

## 3. Shared component system

Define reusable components and their variants before designing pages.

### Buttons

-   Primary, secondary, outline, ghost, destructive.
-   Small, medium, large.
-   Default, hover, focus-visible, pressed, disabled, loading.
-   Primary action must have strong contrast and a clear label.

### Form controls

-   Text input, email input, password input, phone input, checkbox,
    select, date input.
-   Label, helper text, validation message, leading/trailing icon.
-   Default, focused, invalid, disabled, and success states.
-   Password visibility toggle.
-   Do not rely on placeholder text as the only label.

### Commerce components

-   Product card.
-   Category tile.
-   Price block.
-   Discount label.
-   Stock/availability label only when actual stock data is available.
-   Variant selector.
-   Quantity selector.
-   Wishlist/favorite control.
-   Cart summary.
-   Breadcrumbs.

### Feedback components

-   Toast.
-   Inline error.
-   Empty state.
-   Loading skeleton.
-   Confirmation dialog.
-   Form submission/loading state.

### Navigation

-   Desktop header and mobile header.
-   Search field.
-   Language selector.
-   Account menu.
-   Wishlist shortcut.
-   Cart shortcut with item count.
-   Responsive mobile navigation.

## 4. Homepage specification

Create a high-fidelity Arabic RTL homepage with a distinctive
security-technology identity.

### Header

-   Brand logo placeholder.
-   Main navigation.
-   Search products field.
-   Language selector.
-   Account entry.
-   Wishlist icon.
-   Cart icon with count.
-   Mobile menu.

Keep the header clear and compact. Do not overcrowd it.

### Hero

Suggested Arabic headline: **"حماية ذكية تبدأ بالاختيار الصحيح"**

Suggested supporting copy: "اكتشف حلول المراقبة والأمان المناسبة لمنزلك
أو منشأتك."

Primary CTA: **تسوق المنتجات**\
Secondary CTA: **اكتشف حلول الحماية**

Use a premium, relevant CCTV/security product visual. Do not use generic
cyber-security imagery or fake product interfaces.

### Category discovery

Create visual tiles for categories that may be configured by the
store: - كاميرات داخلية - كاميرات خارجية - كاميرات الطاقة الشمسية -
كاميرات 4G - داش كام - أجهزة التسجيل - الإكسسوارات

These are display concepts. Actual category names and availability must
come from active Category/Subcategory records.

### Featured products

Product cards should be data-driven and show: - Product image. -
Localized name. - Price in SAR. - Discounted price and original price
when discount \> 0. - Wishlist action. - Product details action. -
Add-to-cart action.

Do not invent ratings, review counts, brand labels, technical specs, or
stock amounts.

### Additional homepage sections

-   New arrivals / featured products, if the backend supplies the
    selection.
-   A guided "ساعدنا نختار لك" section as a visual discovery entry
    point; do not imply recommendation logic exists unless implemented.
-   Security packages only if package/bundle data is supplied.
-   Trust/service information blocks for delivery, warranty, support,
    and installation, using placeholders until verified.
-   FAQ and footer.

## 5. Authentication pages

Design Login and Sign-up as part of the same design system. They should
feel like a coherent, premium store experience, not a generic admin
login.

### Login page

Arabic-first RTL layout with: - Brand mark and short welcome message. -
Email field. - Password field with show/hide toggle. - Remember-me
checkbox only if supported by the authentication behavior. -
Forgot-password link only if the backend flow exists or is explicitly
planned. - Primary **تسجيل الدخول** button. - Divider with "أو". -
**المتابعة باستخدام Google** button with the official Google G mark
treatment. - Link to create a new account. - Clear inline validation and
server error states. - Loading state during submission.

Do not draw a fake Google logo. Use the official Google identity
treatment and follow Google branding rules when implementing.

### Sign-up page

Fields: - Full name. - Email. - Password. - Confirm password
(client-side confirmation; do not send it as a stored field). - Phone
number (optional unless the business makes it mandatory). - Terms
acceptance only if the store has approved terms and the backend flow
supports it.

Actions: - **إنشاء حساب** - **المتابعة باستخدام Google** - Link to
login.

Explain email verification clearly if it is required by the actual
backend flow. Do not show "account activated" until the server confirms
verification.

### Google Sign-In behavior

Design the user journey for: 1. User clicks "المتابعة باستخدام Google".
2. Browser redirects to the Google OAuth consent flow. 3. User returns
to the store. 4. UI displays a loading/processing state. 5. On
successful backend authentication, user is redirected to the appropriate
store page. 6. On cancellation or failure, show a clear recoverable
error.

Do not create a fake Google popup or collect Google credentials inside
the store form. Google authentication must use the real OAuth
redirect/callback flow provided by the backend.

### Auth states to design

-   Idle form.
-   Field validation error.
-   Invalid credentials.
-   Unverified email, if applicable.
-   Blocked account.
-   Google sign-in in progress.
-   Google sign-in cancelled.
-   Google sign-in failed.
-   Successful authentication.
-   Network/server error.

## 6. Backend schema alignment

The UI must respect the current Mongoose models and must not invent
fields.

### User

Current fields: - `name` - `email` - `password` (optional/null) -
`isActive` - `imageURL` (optional/null) - `role`:
`admin | user | superAdmin` - `phone` (optional/null) - `googleId`
(optional/null) - `isBlocked`

Design implications: - Signup must not expose a role selector. New
public accounts should be ordinary users. - Password must be optional at
the data-model level to support Google-only accounts. - Google sign-in
is a real OAuth flow, not a password form. - Do not expose `isBlocked`,
`isActive`, `googleId`, or internal role controls in the public profile
form. - Phone can be optional in the UI until business requirements make
it mandatory. - Use `name` as a user-entered full name rather than
assuming it is derived from the email prefix.

### Category

-   `en_name`, `ar_name`, `fr_name`
-   `imageURL`
-   `isActive`

### Subcategory

-   `en_name`, `ar_name`, `fr_name`
-   `categoryId`
-   `isActive`

### Product

-   `en_name`, `ar_name`, `fr_name`
-   `en_description`, `ar_description`, `fr_description`
-   `price`, `discount`
-   `imageURLs`, `colorImages`
-   `variants` represented as JSON string: `[{ color, size, stock }]`
-   `subcategoryId`
-   `isActive`

Design implications: - Display the correct localized name and
description with a deliberate fallback when a translation is missing. -
`size` is a free-form variant label; do not assume it means clothing
size. - Variant stock belongs to a color/size combination. -
`colorImages` may be used to change the product gallery when the
selected color changes, if the API exposes that mapping. - Technical
filters such as resolution, connectivity, brand, night vision, and
viewing angle are not represented in this schema. Do not present them as
working filters until the backend supports them.

### Cart

-   `userId`, `productId`, `color`, `size`, `quantity`

Design implications: - Different variants of one product may appear as
separate cart lines. - Quantity must respect the selected variant's
stock. - Final pricing must be confirmed by the backend.

### Order

-   `items`, `subtotal`, `totalAmount`, `shippingCost`
-   `paymentMethod`: `cod | card`
-   `paymentStatus`: `pending | paid | failed`
-   `paymentProvider`, `paymentReference`
-   `orderStatus`:
    `pending | processing | shipped | delivered | cancelled`
-   `shippingStatus`:
    `pending | prepared | shipped | delivered | returned | cancelled`
-   `shippingCarrier`, `trackingNumber`
-   `shippingAddress`
-   `installationRequested`, `installationRequestId`

Design implications: - Payment, order fulfillment, and shipping statuses
must be displayed independently. - Do not promise Mada, Apple Pay,
installments, or a specific payment provider until confirmed by the
integration. - Never collect or store card number/CVV in the store UI.
Use the payment provider's secure flow. - Do not display payment success
before backend confirmation.

### Installation Request

-   `orderId`, `userId`
-   `status`:
    `PENDING | UNDER_REVIEW | SCHEDULED | IN_PROGRESS | COMPLETED | CANCELLED`
-   `contactName`, `phone`, `address`
-   `preferredDate`, `scheduledAt`
-   `notes`, `adminNotes`

Design implications: - Installation request is separate from order,
payment, and shipping. - A preferred date is not a confirmed
appointment. - Do not expose `adminNotes` to customers. - Only show
installation as an option if the business confirms service availability
and coverage.

### Wishlist

-   `userId`, `productId`

Design implications: - Show favorite controls on product cards and
product details. - Provide a wishlist entry point in the header. - Do
not show a wishlist page as functional until the corresponding API is
available. - Prevent duplicate visual entries for the same product.

## 7. Schema recommendations for engineering review

These are recommendations for review, not authorization to modify the
backend.

### User model

1.  Separate account activation from email verification:
    -   Consider `isEmailVerified: boolean`.
    -   Keep `isActive` for whether the account is enabled.
2.  The current comment says "soft-delete state", but the schema has no
    `deletedAt`. Either add a deliberate soft-delete strategy or correct
    the comment.
3.  Consider a partial unique index for `googleId` where the value is a
    string. A normal sparse index may not behave as expected if
    documents store explicit `null`.
4.  Normalize email consistently before persistence and lookup.
5.  Never accept `role`, `isBlocked`, `isActive`, or `googleId` from
    public sign-up input.
6.  Keep password optional for Google-only accounts, but enforce a
    password for email/password registration in validation/service
    logic.
7.  Consider `lastLoginAt` only if login analytics or account activity
    is required.
8.  Decide whether phone is optional or required based on checkout and
    installation requirements. Do not make it unique without a business
    reason.

### Installation request

1.  `orderId` is unique, so the current model permits at most one
    installation request per order. Confirm that this matches the
    business.
2.  Keep `preferredDate` separate from confirmed `scheduledAt`.
3.  Define Saudi service coverage and scheduling rules before adding
    city/district/region fields.
4.  Define whether installation can be requested for COD orders, card
    orders, or both.

### Wishlist

The current user/product unique compound index is appropriate for
preventing duplicate favorites.

## 8. Validation migration: Joi to Zod

The planned validation library is **Zod**, replacing Joi after checking
the current package versions and compatibility.

Do not install or upgrade packages in this design phase.

When implementation begins: - Inspect `package.json` and lockfile
first. - Confirm Node.js and TypeScript versions. - Confirm Express
version and whether the project uses Express 4 or 5. - Check the
installed Zod major version and its supported APIs. - Inspect existing
Joi schemas and middleware before replacing them. - Migrate
incrementally, not by blindly rewriting every validator. - Keep
validation at the request boundary: body, params, and query. - Use
strict schemas for public input and reject unknown sensitive fields. -
Validate and normalize email, phone, password, ObjectId, quantity,
pagination, and enum values. - Never trust client-supplied prices,
totals, roles, stock, payment status, or order status. - Return a
consistent validation error shape without leaking internal details. -
Keep frontend validation for usability, but backend validation remains
authoritative.

## 9. Non-functional UX requirements

-   Correct RTL/LTR switching.
-   Keyboard accessibility and visible focus.
-   Sufficient contrast.
-   Semantic form labels.
-   No horizontal overflow at mobile widths.
-   Touch-friendly controls.
-   Loading, empty, error, disabled, and success states.
-   Avoid fake data that could be mistaken for real store data.
-   Use realistic sample products only as clearly replaceable design
    placeholders.

## 10. Initial Stitch task --- do only these screens

Start by defining the shared design tokens and reusable components, then
create:

1.  Homepage.
2.  Login page.
3.  Sign-up page.

Keep the same header, typography, spacing, colors, buttons, inputs, and
interaction states across all three screens.

The homepage must include product discovery and category sections, but
use clearly marked placeholder content where actual store data is
unavailable.

The login and sign-up pages must include the Google Sign-In entry point
and all relevant visual states.

Do not generate the full checkout, admin dashboard, or every store page
in this first pass.

Do not write application code, modify backend schemas, install
dependencies, or assume API endpoints. This task is UI/UX design only.

**Quality bar:** The result should look like a premium, production-ready
Saudi CCTV e-commerce brand, with a coherent design system and realistic
shopping UX---not a generic template.
