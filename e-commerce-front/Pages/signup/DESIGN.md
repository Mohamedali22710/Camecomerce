---
name: S Plus Security
colors:
  surface: '#f9f9ff'
  surface-dim: '#d1daf4'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f3ff'
  surface-container: '#e9edff'
  surface-container-high: '#e1e8ff'
  surface-container-highest: '#d9e2fc'
  on-surface: '#121b2e'
  on-surface-variant: '#434655'
  inverse-surface: '#273044'
  inverse-on-surface: '#edf0ff'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#525e7a'
  on-secondary: '#ffffff'
  secondary-container: '#d3dfff'
  on-secondary-container: '#56637e'
  tertiary: '#784b00'
  on-tertiary: '#ffffff'
  tertiary-container: '#996100'
  on-tertiary-container: '#ffeedd'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#d8e2ff'
  secondary-fixed-dim: '#bac6e6'
  on-secondary-fixed: '#0e1b33'
  on-secondary-fixed-variant: '#3a4761'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#f9f9ff'
  on-background: '#121b2e'
  surface-variant: '#d9e2fc'
  brand-navy: '#101D35'
  brand-navy-soft: '#1B2B49'
  surface-page: '#F7F8FA'
  surface-card: '#FFFFFF'
  text-primary: '#172033'
  text-secondary: '#667085'
  border-default: '#E5E7EB'
  state-success: '#16A34A'
  state-warning: '#D97706'
  state-error: '#DC2626'
typography:
  display-hero:
    fontFamily: IBM Plex Sans
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 60px
    letterSpacing: -0.02em
  display-hero-mobile:
    fontFamily: IBM Plex Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 42px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: IBM Plex Sans
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 46px
  headline-lg-mobile:
    fontFamily: IBM Plex Sans
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 34px
  headline-md:
    fontFamily: IBM Plex Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: IBM Plex Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  title-md:
    fontFamily: IBM Plex Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  price-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 28px
  price-md:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '700'
    lineHeight: 24px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

The design system embodies **Premium Security Technology**: confident, calibrated, modern, precise, and approachable. It serves homeowners, facility managers, and technical specialists across Saudi Arabia seeking robust surveillance and protection infrastructure. The aesthetic rejects generic SaaS dashboards and aggressive tech hyperbole, favoring instead architectural precision, structural clarity, and calm operational dependability.

The design movement combines **Minimalism** with subtle **Tactile Precision**:
- High-contrast, clean visual hierarchy built on stark dark navy structural anchors (`#101D35`) and pristine white card canvases (`#FFFFFF`) against an ultra-soft cool surface (`#F7F8FA`).
- Technical clarity characterized by 1px precision hairline borders (`#E5E7EB`), purposeful informational pacing, and restrained chromatic accentuation.
- Native Arabic-first (RTL) typography with deliberate geometric harmony, ensuring identical visual weight and scanning rhythm across Arabic, English, and French viewports.
- Restrained, purposeful highlights: energetic blue (`#2563EB`) drives actionable affordances, while warm amber (`#F59E0B`) is strictly reserved for selective badges and promotional callouts.

## Colors

The palette establishes an immediate sense of enterprise-grade security and clarity. 

### Core Palette Application
- **Primary (`#2563EB`)**: Dedicated solely to active triggers, interactive links, primary purchase flows, and active state indicators. Never use as generic background fills.
- **Secondary (`#101D35` / `brand.navy`)**: Anchors global headers, high-impact hero banners, and technical navigation bars. Provides weight and authoritative presence.
- **Tertiary (`#F59E0B` / `brand.orange`)**: Used with strict austerity—only for tactical promotion tags, security alerts, and key badge accents.
- **Neutral (`#172033` / `text.primary`)**: Deep blue-tinted slate for high-legibility typographic output, paired with `#667085` (`text.secondary`) for metadata, technical specs, and subtext.

### Surface Hierarchy
- `surface.page` (`#F7F8FA`): Cool-tinted, sterile neutral providing crisp contrast against pure white containers.
- `surface.card` (`#FFFFFF`): Isolated workspaces, product tiles, form sheets, and dialog surfaces.
- `border.default` (`#E5E7EB`): Structural demarcation lines, table dividers, and idle form outlines.

## Typography

Typographic scale is optimized for bilingual parity with native RTL primary execution.

### Font Family Allocations
- **Arabic Script**: Implemented with **IBM Plex Sans Arabic** (or **Cairo** fallback), preserving generous line heights (1.5x to 1.6x body ratio) to prevent clipping of diacritics and complex character glyphs.
- **Latin & Numerical Script**: Implemented with **Inter** for all English/French copy, SKU codes, technical dimension indicators, and Saudi Riyal currency values (`SAR` / `ر.س`).

### Rules for Composition
- Line heights must remain generous on all Arabic copy to prevent dense visual crowding.
- Numerals and monetary values consistently use tabular figures (`font-variant-numeric: tabular-nums`) to maintain alignment across e-commerce product comparison tables, cart summaries, and catalog grids.

## Layout & Spacing

The layout is structured around an absolute 4px base increment module (`4, 8, 12, 16, 24, 32, 40, 48, 64px`) across an RTL-first responsive grid.

### Breakpoints & Grid Geometry
- **Desktop (1440px / Max Container 1280px)**: 12-column fluid grid, 24px gutters, 32px canvas margin.
- **Laptop (1280px)**: 12-column fluid grid, 20px gutters, 24px canvas margin.
- **Tablet (768px)**: 8-column fluid grid, 16px gutters, 20px canvas margin.
- **Mobile (390px)**: 4-column fluid grid, 12px gutters, 16px canvas margin.

### Alignment & Directionality
- Default layout flow is mirrored completely for RTL: navigation triggers on right, cart/account on left, back icons inverted (Arabic pointing right `→` for return, left `←` for advance).
- Strict content max-width is locked at 1280px to preserve comfortable scan lines on wide monitors.

## Elevation & Depth

Visual hierarchy is constructed through crisp tonal containment and diffuse, low-opacity ambient shadows rather than dramatic blur layers.

- **Level 0 (Flat / Canvas)**: `surface.page` (`#F7F8FA`) with no elevation.
- **Level 1 (Card & Content Blocks)**: `surface.card` (`#FFFFFF`) with 1px border (`#E5E7EB`) and ambient shadow `0 1px 3px 0 rgba(16, 29, 53, 0.04), 0 1px 2px 0 rgba(16, 29, 53, 0.02)`.
- **Level 2 (Hovered Cards & Dropdowns)**: Ambient shadow `0 10px 15px -3px rgba(16, 29, 53, 0.06), 0 4px 6px -2px rgba(16, 29, 53, 0.03)` with border shifting to `#D1D5DB`.
- **Level 3 (Sticky Headers & Overlays)**: Background `#101D35` (solid) or `#FFFFFF` with shadow `0 20px 25px -5px rgba(16, 29, 53, 0.08), 0 10px 10px -5px rgba(16, 29, 53, 0.04)`.
- **Focus Outlines**: Unambiguous 2px ring in primary blue with a 2px offset (`ring-2 ring-[#2563EB] ring-offset-2`).

## Shapes

The design system employs a **Rounded** shape language (`roundedness: 2` = 0.5rem base) balancing industrial hardware precision with consumer software approachability.

- **Controls & Form Inputs**: 8px (`rounded-md` / 0.5rem) to 10px corner radius for crisp, tactile button and text field definition.
- **Product & Solution Cards**: 12px to 16px (`rounded-lg` to `rounded-xl`) corner radius, creating gentle visual containment for hardware photography.
- **Badges, Status Chips, & Pills**: Fully rounded pill shapes (`9999px`) to immediately distinguish informational tags from interactive rectangular controls.

## Components

### 1. Buttons
- **Primary**: Solid `#2563EB` fill, `#FFFFFF` text, 10px radius, 48px height (`md`). Hover: `#1D4ED8`. Active: `#1E40AF`.
- **Secondary (Dark Surface)**: `#101D35` fill, `#FFFFFF` text. Hover: `#1B2B49`. Used for major structural actions like "اكتشف حلول الحماية".
- **Outline**: 1px `#E5E7EB` border, transparent background, `#172033` text. Hover: `#F7F8FA` background, `#101D35` text.
- **Ghost**: Transparent fill, `#172033` text. Hover: `#F7F8FA` background.
- **Loading State**: Primary background retained; label replaced by a calibrated dual-ring spinner; click events disabled.

### 2. Form Inputs
- **Base Container**: 48px height, 1px `#E5E7EB` stroke, `#FFFFFF` fill, 8px radius.
- **Labeling**: Top persistent label in `label-md` (`#172033`). Floating labels strictly avoid covering user-entered text.
- **States**:
  - *Default*: Border `#E5E7EB`, text `#172033`, placeholder `#9CA3AF`.
  - *Focus*: Border `#2563EB`, outer ring `2px rgba(37, 99, 235, 0.15)`.
  - *Error*: Border `#DC2626`, inline error message with warning icon in `state-error`.
  - *Disabled*: Fill `#F3F4F6`, border `#E5E7EB`, text `#9CA3AF`, cursor not-allowed.
- **Password Toggle**: Trailing icon (RTL: left side) toggle eye icon button with tab-stop exclusion.

### 3. Product Cards (CCTV Hardware)
- **Container**: White surface, 12px radius, 1px `#E5E7EB` border.
- **Image Container**: Neutral grey backdrop (`#F7F8FA`), 1:1 aspect ratio, centered product isolation cutout.
- **Badges**: Top corner floating pill: Promotional discount in `#F59E0B` with dark text, or stock indicator. Opposite corner houses the round wishlist toggle (36px circle).
- **Price Block**: Distinct `price-md` in `SAR` (`text.primary`), accompanied by strikethrough original price when `discount > 0`.
- **Action Tier**: Full-width secondary or primary button "أضف للسلة" (Add to Cart) with direct variant safety trigger.

### 4. Category Tiles
- Square or 4:3 rounded cards (12px radius), bordered with `#E5E7EB`.
- Subtle 1.03x image zoom transition on hover.
- Bold category name centered or bottom-anchored over a soft gradient shield (`rgba(16, 29, 53, 0.65)` to transparent).

### 5. Trust & Service Badges
- Low-contrast horizontally stacked panels on `#F7F8FA` surface.
- 40px circular background holding a single-color icon (`#2563EB` or `#101D35`).
- Precise headline in `title-md` and supporting guarantee copy in `body-sm` (`#667085`).

### 6. Navigation Bar
- **Top Utility Header (Navy `#101D35`)**: Language switcher (العربية / English / Français), contact helpline, localized currency notation (SAR).
- **Main Header (White `#FFFFFF`)**: Brand logo on right (RTL), expansive search input with categorical filter, Account dropdown, Wishlist counter, and Cart drawer trigger on left (RTL).
- **Mobile Sticky Bottom Nav**: 5-tab quick bar (Home, Categories, Search, Wishlist, Cart) with haptic feedback styling and 12px pill notifications.

### 7. Authentication Controls
- Clean single-column layout max-width 440px.
- Prominent Google OAuth button: white card, `#E5E7EB` border, official Google SVG icon, localized label "المتابعة باستخدام Google" with full keyboard focus support.
- Distinct typographic divider: "أو" flanked by hairline neutral borders.