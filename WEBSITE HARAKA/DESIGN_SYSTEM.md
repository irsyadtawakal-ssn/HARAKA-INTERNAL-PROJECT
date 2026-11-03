# Haraka Erfi Design System

**Design Direction**: Premium Cosmetic Manufacturing · Modern B2B · Editorial Corporate

---

## Philosophy

The Haraka Erfi design system is built on **editorial restraint** and **manufacturing precision**. Every element serves a purpose. No decoration for decoration's sake.

**Key Principles**:

- **Editorial** over dashboard-like
- **Warm** over clinical
- **Restrained** over excessive
- **Flat** over layered
- **Typographic** over icon-heavy
- **Trustworthy** over flashy

---

## Typography

### Font Pairing

**Display & Headlines**: DM Serif Display  
**Body & UI**: DM Sans  
**Data & Labels**: DM Mono

All three fonts are from the same DM superfamily (Colophon Foundry), ensuring optical coherence.

### Type Scale & Hierarchy

```
Display XL    72px (4.5rem)    Headlines, hero sections
Display LG    56px (3.5rem)    Page titles
Display MD    44px (2.75rem)    Section titles
Heading XL    36px (2.25rem)    Major headings
Heading LG    28px (1.75rem)    Sub-headings
Heading MD    22px (1.375rem)   Card titles
Heading SM    18px (1.125rem)   Small headings
Body LG       18px (1.125rem)   Pull quotes, intro text
Body MD       16px (1rem)       Standard body
Body SM       14px (0.875rem)   Secondary text
Caption       11px (0.6875rem)  Metadata, timestamps
Label         12px (0.75rem)    Form labels, uppercase
```

All display sizes use `clamp()` for fluid responsiveness.

### Usage Classes

```css
.display-xl       /* Hero headlines */
.display-lg       /* Page titles */
.display-md       /* Section titles */
.heading-xl       /* Major headings */
.heading-lg       /* Sub-headings */
.heading-md       /* Card titles */
.heading-sm       /* Small headings */
.eyebrow          /* Section labels (mono, uppercase) */
.body-lg          /* Intro paragraphs */
.body-md          /* Standard body */
.body-sm          /* Secondary text */
.caption          /* Metadata */
.label            /* Form labels (uppercase) */
```

---

## Colors

### Palette Philosophy

**Base**: Warm neutrals (cream & ink) create a canvas that feels premium and editorial, not sterile white.

**Accent**: Warm gold connects to natural ingredients and cosmetic packaging without reading as luxury jewelry.

### Color Tokens

#### Cream & Ink (Primary)

```
cream-50     #fdfcf7    Page background
cream-100    #f9f6ed    Section alternate
cream-200    #f0ead8    Hover surfaces
ink-900      #1a1917    Primary text
ink-700      #3d3a35    Body text
ink-500      #6b6560    Muted text
ink-300      #b5b0a8    Disabled / placeholder
ink-100      #e8e4de    Hairline borders
charcoal     #2b2926    Dark surfaces
```

#### Warm Gold (Accent)

```
gold-warm    #c9a96e    Primary accent
gold-deep    #9e7a3d    Hover / pressed
gold-pale    #ede0c4    Accent tint
```

#### Functional

```
error        #c0392b    Form errors
success      #2d6a4f    Success states
warning      #9a6700    Alerts
```

### Color Usage Rules

1. **Accent sparingly** — Gold appears maximum twice per viewport
2. **No gradients** — Flat fills only
3. **No drop shadows** — Depth via whitespace and border contrast
4. **Background alternation** — cream-50 → cream-100 → charcoal (never two dark sections adjacent)

---

## Layout

### Container Widths

```
container-max           1280px    Global max content width
container-editorial     760px     Article, philosophy, prose
container-card-grid     1120px    Card grids, features
container-form          640px     Forms, narrow content
```

### Gutters (Responsive)

```
Mobile (≥0px)           24px (spacing-6)
Tablet (≥768px)         48px (spacing-12)
Desktop (≥1024px)       80px (spacing-20)
```

### Section Spacing

All sections use consistent vertical rhythm:

```
Mobile:     64px top/bottom (spacing-16)
Desktop:    96px top/bottom (spacing-24)
```

Use utility classes:

```css
.container-default       /* Max-width + responsive gutters */
.section-padding-y       /* Vertical section padding */
```

### Grid System

```
.grid-2    1 col mobile → 2 col tablet+
.grid-3    1 col mobile → 2 col tablet → 3 col desktop
.grid-4    1 col mobile → 2 col tablet → 4 col desktop
```

---

## Components

### Buttons

**4 Variants**:

- `primary` — Dark fill (ink-900)
- `secondary` — Outlined (transparent + border)
- `pill` — Accent fill (gold-warm)
- `ghost` — Text link with underline

**3 Sizes**:

- `sm` — 40px height
- `default` — 48px height
- `lg` — 56px height

**Usage**:

```tsx
<Button variant="primary" size="lg">
  Mulai Konsultasi
</Button>
```

### Links

**Inline text links**:

```tsx
<a href="/path" className="link-inline link-arrow">
  Pelajari lebih lanjut
</a>
```

Underline color transitions from `ink-300` to `gold-warm` on hover.

### Section Label (Eyebrow)

Small mono uppercase label above headings:

```tsx
<SectionLabel>Layanan Kami</SectionLabel>
<SectionLabel dark>Proses Kami</SectionLabel>
```

Renders with `—` dash prefix in gold.

### Service Card

Numbered card with top accent border:

```tsx
<ServiceCard
  number="01"
  title="Formulasi Custom"
  description="..."
  href="/services/formulasi-custom"
/>
```

Hover: Border-top changes to gold, card lifts 2px.

### Stat Block

Large number + label + subtext:

```tsx
<StatBlock value="1,200+" label="Formulas" subtext="Ready-made and custom" />
```

### Process Step

For dark sections (charcoal bg):

```tsx
<ProcessStep number="01" label="Konsultasi" description="..." />
```

Number in gold at 40% opacity, label in italic serif.

### Certification Badge

Logo + name in horizontal layout:

```tsx
<CertificationBadge name="ISO 22716:2007" logoSrc="/certs/iso.png" logoAlt="ISO 22716" />
```

Logo desaturated by default, full color on hover.

### Article Card

For journal/blog grid:

```tsx
<ArticleCard
  slug="memulai-brand-kosmetik"
  title="Panduan Lengkap..."
  category="Brand Building"
  publishedAt="10 Agustus 2026"
  thumbnailSrc="/journal/thumb.jpg"
/>
```

### CTA Band

Full-width conversion section:

```tsx
<CTABand
  eyebrow="Siap Memulai?"
  headline="Bangun Brand Anda Bersama Kami"
  subtext="Konsultasi pertama gratis..."
  primaryCTA={{ label: "...", href: "/kontak" }}
  secondaryCTA={{ label: "...", href: "/wa" }}
/>
```

Dark background (ink-900), centered content.

### Pull Quote

Editorial block quote:

```tsx
<blockquote className="pull-quote">
  Formulasi tersertifikasi, diproduksi dengan standar internasional.
</blockquote>
```

### Badge

Small inline label:

```tsx
<span className="badge">Client Story</span>
```

Gold-pale background, 2px border radius (only element with radius).

### Logo Wall

Client/partner logos in grid:

```tsx
<div className="logo-wall">
  <img src="/logo1.png" alt="Client 1" />
  <img src="/logo2.png" alt="Client 2" />
  ...
</div>
```

Logos grayscale at 40%, full color on hover.

---

## Spacing System

**8px grid** — All spacing tokens are multiples of 4px (with 8px as primary).

```
spacing-1     4px      Icon padding, tight gaps
spacing-2     8px      Button padding, badge
spacing-3     12px     Input padding
spacing-4     16px     Paragraph spacing
spacing-5     20px     Component padding
spacing-6     24px     Card padding (mobile)
spacing-8     32px     Card padding (desktop)
spacing-10    40px     Sub-section spacing
spacing-12    48px     Component-to-component
spacing-16    64px     Section padding (mobile)
spacing-20    80px     Section padding (tablet)
spacing-24    96px     Section padding (desktop)
spacing-32    128px    Hero extra space
spacing-40    160px    Large editorial gap
spacing-48    192px    Full-bleed padding
```

---

## Images

### Aspect Ratios

```css
.image-ratio-16-9    Hero, full-bleed
.image-ratio-4-3     Facility gallery
.image-ratio-3-2     Card thumbnails
.image-ratio-1-1     Team portraits
```

### Guidelines

- **No rounded corners** on images
- **Breathing room** — minimum 32px gap between image and adjacent text
- **Object-fit: cover** for all editorial images
- **Warm color grading** — 5000–5500K, -10 to -15 saturation

---

## Animation

### Timing & Easing

```css
--ease-fast     150ms ease              Hover states
--ease-base     200ms ease              Transitions
--ease-slow     400ms cubic-bezier      Fade-in
--ease-reveal   600ms cubic-bezier      Scroll reveal
```

### Principles

1. **No entrance animations** above-the-fold
2. **Respect `prefers-reduced-motion`** — all motion disabled when preference active
3. **No parallax** — fights editorial stillness
4. **No looping** animations unless user-triggered
5. **Scroll reveal**: `opacity: 0 → 1` + `translateY: 16px → 0`
6. **Stagger**: 80ms per item when multiple elements animate together

---

## Accessibility

### Focus Rings

All interactive elements have visible focus rings:

```css
:focus-visible {
  outline: 2px solid var(--color-gold-warm);
  outline-offset: 2px;
}
```

### Touch Targets

Minimum `44px × 44px` for all tappable elements (WCAG 2.5.8).

### Color Contrast

- **Body text**: 4.5:1 minimum (ink-900 on cream-50 = 14:1 ✓)
- **Large text**: 3:1 minimum
- **UI elements**: 3:1 minimum

### Reduced Motion

```tsx
import { useReducedMotion } from "@/hooks/use-reduced-motion"

const prefersReducedMotion = useReducedMotion()
// Disable animations if true
```

---

## Examples

### Showcase Page

Visit `/design-system` to see all components in context.

### Component Usage

```tsx
import { SectionLabel } from "@/components/ui/section-label"
import { Button } from "@/components/ui/button"
import { ServiceCard } from "@/components/ui/service-card"

;<section className="section-padding-y bg-alt">
  <div className="container-default">
    <SectionLabel>Layanan Kami</SectionLabel>
    <h2 className="display-md mb-12">Solusi Manufaktur End-to-End</h2>
    <div className="grid-4">
      <ServiceCard
        number="01"
        title="Formulasi Custom"
        description="..."
        href="/services/formulasi-custom"
      />
      {/* ... */}
    </div>
  </div>
</section>
```

---

## Design North Star

> Haraka Erfi's website should feel like entering a well-lit, meticulously organized laboratory run by people who understand both science and aesthetics — not a factory brochure, not a beauty brand, not a startup pitch deck.

Trust earned through restraint, not badge accumulation.

---

**Last updated**: August 10, 2026  
**Design system location**: `src/styles/globals.css` + `src/components/ui/*`
