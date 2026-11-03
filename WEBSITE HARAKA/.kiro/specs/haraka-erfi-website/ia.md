Create the complete visual design system for Haraka Erfi.

Design direction:

Premium cosmetic manufacturing.
Modern B2B.
Editorial corporate.
Minimal.
Warm.
Sophisticated.
Trustworthy.

Do NOT use generic SaaS styling.

Do NOT use:

- excessive rounded cards
- glassmorphism
- neon gradients
- purple/blue startup gradients
- excessive shadows
- excessive borders
- random decorative blobs
- excessive icons
- excessive badges
- excessive animations

Define and implement:

### Typography

Use a sophisticated editorial display font paired with a highly readable sans-serif.

Suggested direction:

- Display: Instrument Serif or similar
- Body/UI: Geist or Inter

Create a clear hierarchy:

Display
H1
H2
H3
Eyebrow
Body Large
Body
Small
Caption

Typography should feel editorial rather than dashboard-like.

### Colors

Create a restrained neutral palette.

Base direction:

Background:
warm off-white

Foreground:
deep charcoal

Secondary:
muted warm gray

Accent:
subtle earthy brown / warm cosmetic tone

Use accent colors sparingly.

Do not make the website visually dominated by the accent color.

### Layout

Use a strong editorial grid.

Define:

- max content width
- desktop gutters
- tablet gutters
- mobile gutters
- section spacing
- typography spacing
- grid behavior

### Components

Define reusable styles for:

- Navbar
- Buttons
- Links
- Section headers
- Image blocks
- Service blocks
- Process steps
- Statistics
- Product showcase
- Testimonial
- Logo wall
- CTA sections
- Footer

Important:

The design system should make every section feel like part of one coherent brand.

Implement the system before building individual pages.

# Part X — Global Systems Architecture

---

## §34 — Page-by-Page Architecture

### `/` — Homepage

| Field                         | Value                                                                                                |
| ----------------------------- | ---------------------------------------------------------------------------------------------------- |
| **Purpose**                   | Establish brand identity, communicate value proposition, qualify visitors, route to conversion       |
| **Target visitor**            | First-time brand owner or entrepreneur via Google / Instagram; returning visitor from email/WhatsApp |
| **Primary question answered** | "Is Haraka Erfi a credible partner who can manufacture my cosmetic brand?"                           |
| **Primary CTA**               | "Mulai Konsultasi" → `/kontak`                                                                       |
| **Secondary CTA**             | "Lihat Portofolio" → `/portofolio`                                                                   |
| **Conversion role**           | Full funnel: Awareness → Interest → Consideration → Intent                                           |

**Required content**: Value proposition headline · certification logos · key stats (brands, formulas, MOQ) · service overview (4 items) · differentiators · 4-step process summary · facility photography · product category tiles · 1 featured case study · 3 journal articles · final CTA band

**Section hierarchy**:

- H1: Main value proposition (e.g. "Mitra Manufaktur Kosmetik Terpercaya di Indonesia")
- H2: Each major section heading (Kapabilitas, Layanan Kami, Proses Kami, dll.)
- H3: Sub-items within sections (service names, step labels, differentiator titles)

---

### `/services` — Services Hub

| Field                         | Value                                                                            |
| ----------------------------- | -------------------------------------------------------------------------------- |
| **Purpose**                   | Routing layer — help visitors identify the right service for their need          |
| **Target visitor**            | Brand owner who knows they need manufacturing but hasn't decided on service type |
| **Primary question answered** | "What exactly can Haraka Erfi do for me?"                                        |
| **Primary CTA**               | Each card → respective `/services/[slug]`                                        |
| **Secondary CTA**             | "Belum tahu butuh apa? Konsultasi gratis →" → `/kontak`                          |
| **Conversion role**           | Consideration — routes to depth                                                  |

**Required content**: 4 service cards (numbered 01–04) · 1-sentence description per service · MOQ range per service · link to detail page · bottom conversion prompt

**Recommended sections**:

1. Page header (section label + H1 + sub-headline)
2. Services 4-up grid
3. "Tidak yakin layanan mana yang tepat?" CTA block → `/kontak`

**H1**: "Layanan Manufaktur Kosmetik Kami"
**H2s**: Formulasi Custom · Private Label · Desain & Kemasan · Regulasi & Sertifikasi

---

### `/services/[slug]` — Service Detail Pages (4 pages)

| Field                         | Value                                                                 |
| ----------------------------- | --------------------------------------------------------------------- |
| **Purpose**                   | Convince visitor that this specific service solves their problem      |
| **Target visitor**            | Visitor who has identified their service need; evaluating feasibility |
| **Primary question answered** | "Can Haraka Erfi actually deliver this, and what does it involve?"    |
| **Primary CTA**               | "Ajukan Brief Formulasi" → `/kontak?service=[slug]`                   |
| **Secondary CTA**             | "Lihat Proses Lengkap →" → `/proses`                                  |
| **Conversion role**           | Intent — closest to a purchase decision                               |

**Required content**: Service definition · what's included (bullet list) · MOQ range · typical lead time · relevant certifications · related case study (pulled from CMS) · FAQ items specific to this service · CTA

**Recommended sections**:

1. Service hero (full-width header image + service title + tagline)
2. What's included
3. Capabilities + spec table (MOQ, lead time, delivery format)
4. Relevant certifications
5. Related case study (editorial block)
6. Service-specific FAQ (3–5 items)
7. CTA band

---

### `/capabilities` — Technical Capabilities

| Field                         | Value                                                                                  |
| ----------------------------- | -------------------------------------------------------------------------------------- |
| **Purpose**                   | Technical reference sheet for evaluators and procurement; validate scope and standards |
| **Target visitor**            | Brand owner doing due diligence; procurement manager comparing vendors                 |
| **Primary question answered** | "Does Haraka Erfi have the technical depth, scale, and certifications for my brand?"   |
| **Primary CTA**               | "Diskusikan Kebutuhan Anda →" → `/kontak`                                              |
| **Secondary CTA**             | "Lihat Fasilitas Kami →" → `/fasilitas`                                                |
| **Conversion role**           | Consideration → Evaluation                                                             |

**Required content**: Product category matrix (skincare / haircare / bodycare / makeup) · formulation types · active ingredient capabilities · production capacity (units/month) · MOQ table · certifications with validity dates · technology/equipment list

**Recommended sections**:

1. Page header
2. Product category tiles (filterable: Skincare · Haircare · Bodycare · Makeup)
3. Formulation capabilities table
4. Capacity & MOQ data grid
5. Certifications matrix (logo + name + issuer + validity)
6. Equipment & Technology list
7. CTA band

**H1**: "Kapabilitas Manufaktur"
**H2s**: Kategori Produk · Kemampuan Formulasi · Kapasitas & MOQ · Sertifikasi · Teknologi Produksi

---

### `/proses` — How It Works

| Field                         | Value                                                                                   |
| ----------------------------- | --------------------------------------------------------------------------------------- |
| **Purpose**                   | Reduce anxiety about the maklon process; show the path from inquiry to launched product |
| **Target visitor**            | First-time brand owner who has never done contract manufacturing                        |
| **Primary question answered** | "What actually happens after I contact Haraka Erfi, and how long will it take?"         |
| **Primary CTA**               | "Jadwalkan Konsultasi Pertama" → Calendly embed                                         |
| **Secondary CTA**             | "Download Panduan Memulai Brand" (lead magnet PDF, email gate)                          |
| **Conversion role**           | Intent — removes the final objection before contacting                                  |

**Required content**: 4-step process (Konsultasi → Formulasi → Produksi → Peluncuran) · timeline per step · what the client does vs. what Haraka Erfi does · typical total lead time · process FAQ (5–7 items) · lead magnet CTA

**Recommended sections**:

1. Page header
2. Process overview (4-step rail, desktop; vertical, mobile)
3. Step detail blocks (expanded per step with timeline and responsibilities)
4. Timeline summary table
5. Process FAQ (accordion)
6. Lead magnet download block
7. Calendly booking embed

**H1**: "Dari Ide ke Produk: Proses Kerja Kami"
**H2s**: Konsultasi Awal · Pengembangan Formula · Produksi & QC · Peluncuran Produk · Pertanyaan Umum

---

### `/portofolio` — Portfolio Hub

| Field                         | Value                                                              |
| ----------------------------- | ------------------------------------------------------------------ |
| **Purpose**                   | Demonstrate Haraka Erfi's track record through real brand outcomes |
| **Target visitor**            | Skeptical visitor needing proof before committing to contact       |
| **Primary question answered** | "Has Haraka Erfi done this for brands like mine before?"           |
| **Primary CTA**               | "Bangun Brand Anda Bersama Kami →" → `/kontak`                     |
| **Secondary CTA**             | Individual case study cards → `/portofolio/[slug]`                 |
| **Conversion role**           | Proof / Social validation                                          |

**Required content**: Case study grid (6–12 items) · filter by product category · brand name + category + 1-line outcome per card · featured case study pinned at top

**Recommended sections**:

1. Page header
2. Category filter tabs (Semua · Skincare · Haircare · Bodycare · Makeup)
3. Case study grid (3-column desktop, 1-column mobile)
4. CTA band

**H1**: "Brand yang Telah Kami Bangun"
**H2s**: Filter category labels (rendered as tab labels, not headings)

---

### `/portofolio/[slug]` — Case Study Detail

| Field                         | Value                                                                                |
| ----------------------------- | ------------------------------------------------------------------------------------ |
| **Purpose**                   | Deep-dive into one brand's journey to build maximum trust and aspiration             |
| **Target visitor**            | Visitor who clicked through from portfolio grid or organic Google search             |
| **Primary question answered** | "How did Haraka Erfi help this brand specifically, and can they do the same for me?" |
| **Primary CTA**               | "Mulai Perjalanan Brand Anda →" → `/kontak`                                          |
| **Secondary CTA**             | "← Lihat Portofolio Lainnya" → `/portofolio`                                         |
| **Conversion role**           | High-intent conversion — narrative proof                                             |

**Required content**: Brand name + category + tagline · challenge/problem statement · Haraka Erfi's solution · outcome with key metric · product photography · services used (linked) · client quote (if available)

**Recommended sections**:

1. Case study header (brand name + category tag + hero image)
2. Challenge block
3. Solution narrative (editorial prose)
4. Outcome metric (large display number)
5. Product gallery
6. Services used (linked chips)
7. CTA band

---

### `/fasilitas` — Facility Showcase

| Field                         | Value                                                                    |
| ----------------------------- | ------------------------------------------------------------------------ |
| **Purpose**                   | Visual proof of manufacturing quality, scale, and compliance             |
| **Target visitor**            | Quality-conscious brand owner performing due diligence before committing |
| **Primary question answered** | "Is Haraka Erfi's facility up to the standard my brand needs?"           |
| **Primary CTA**               | "Jadwalkan Kunjungan Fasilitas →" → `/kontak?intent=facility-visit`      |
| **Secondary CTA**             | "Lihat Sertifikasi →" → `/tentang/sertifikasi`                           |
| **Conversion role**           | Trust / Credibility — removes quality doubt                              |

**Required content**: Masonry photo gallery organized by area (Lab · Produksi · QC · Pengemasan · Eksterior) · area description per category · certifications summary · GMP compliance statement

**Recommended sections**:

1. Page header
2. Full-bleed hero image (lab or cleanroom)
3. Area-by-area gallery with caption and short description
4. GMP & compliance statement block
5. Certifications summary row
6. Visit invitation CTA

**H1**: "Fasilitas Produksi Kami"
**H2s**: Laboratorium Formulasi · Lantai Produksi · Quality Control · Area Pengemasan

---

### `/tentang` — About Hub

| Field                         | Value                                                                                           |
| ----------------------------- | ----------------------------------------------------------------------------------------------- |
| **Purpose**                   | Build brand affinity and communicate Haraka Erfi's manufacturing ethos and people               |
| **Target visitor**            | Visitor who has already evaluated services and now wants to understand who they're working with |
| **Primary question answered** | "Who is Haraka Erfi and can I trust the people behind it?"                                      |
| **Primary CTA**               | "Mulai Konsultasi →" → `/kontak`                                                                |
| **Secondary CTA**             | "Lihat Fasilitas Kami →" → `/fasilitas`                                                         |
| **Conversion role**           | Relationship / Trust — late funnel                                                              |

**Required content**: Company story (founding year, mission, growth) · manufacturing philosophy · team section · sub-page links (Filosofi · Tim · Sertifikasi)

**Recommended sections**:

1. Page header
2. Company story (editorial prose, 2–3 paragraphs)
3. Philosophy pull-quote block
4. Team grid (photo + name + role)
5. Sub-page navigation tiles (Filosofi · Tim · Sertifikasi)
6. CTA band

**H1**: "Tentang Haraka Erfi"
**H2s**: Kisah Kami · Filosofi Manufaktur · Tim Kami

---

### `/faq` — FAQ

| Field                         | Value                                                                                           |
| ----------------------------- | ----------------------------------------------------------------------------------------------- |
| **Purpose**                   | Handle all common objections and questions in one place; capture long-tail SEO                  |
| **Target visitor**            | Any visitor at mid-to-late funnel with specific unanswered questions                            |
| **Primary question answered** | All the specific questions visitors have before contacting (MOQ, timeline, BPOM, pricing, etc.) |
| **Primary CTA**               | "Masih ada pertanyaan? Hubungi kami →" → `/kontak`                                              |
| **Secondary CTA**             | "Chat via WhatsApp" → WhatsApp deep link                                                        |
| **Conversion role**           | Objection removal — enables conversion for hesitant visitors                                    |

**Required content**: 10–15 FAQ items organized by category · FAQ schema markup · contact prompt at bottom

**Recommended sections**:

1. Page header
2. Category tabs: Proses · Harga & MOQ · Regulasi · Teknis · Umum
3. Accordion FAQ list (filtered by active category)
4. "Tidak menemukan jawaban?" CTA block

**H1**: "Pertanyaan yang Sering Diajukan"
**H2s**: Category labels (Proses Kerja · Harga & MOQ · Regulasi BPOM & Halal · Teknis Formulasi · Umum)

---

### `/kontak` — Contact & Consultation

| Field                         | Value                                                                          |
| ----------------------------- | ------------------------------------------------------------------------------ |
| **Purpose**                   | Convert visitor into a qualified lead via consultation booking or contact form |
| **Target visitor**            | High-intent visitor ready to initiate a conversation                           |
| **Primary question answered** | "How do I start working with Haraka Erfi?"                                     |
| **Primary CTA**               | "Jadwalkan Konsultasi Gratis" → Calendly embed                                 |
| **Secondary CTA**             | "Kirim Pesan" → Contact form submission                                        |
| **Conversion role**           | Action — terminal conversion page                                              |

**Required content**: Calendly booking embed · contact form (8 fields, see §27) · office address · Google Maps embed · phone/WhatsApp · business hours · response time promise · 3 contextual FAQ items

**Recommended sections**:

1. Page header ("Mulai Perjalanan Brand Anda")
2. Two-column split: Calendly left / Contact form right (desktop); stacked (mobile)
3. Contact details block (address, phone, email, hours)
4. Google Maps embed
5. Response time promise: "Kami merespons dalam 1 hari kerja"

**H1**: "Mulai Konsultasi"
**H2s**: Jadwalkan Pertemuan · Kirim Pesan · Temukan Kami

---

## §35 — Global Navigation Architecture (Desktop)

### Structure

```
[Logo]    Services    Capabilities    Proses    Portofolio    Tentang    [Mulai Konsultasi ▶]
```

**Items**: 5 nav links + 1 CTA pill. Total 6 elements. No mega-menus.

| Item             | Destination     | Dropdown          | Rationale                                                                                                                                |
| ---------------- | --------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Services         | `/services`     | Yes — 4 sub-items | 4 service sub-pages warrant a simple dropdown (not mega-menu). Hover reveals list: Formulasi Custom · Private Label · Kemasan · Regulasi |
| Capabilities     | `/capabilities` | No                | Single destination, no sub-pages needed in nav                                                                                           |
| Proses           | `/proses`       | No                | Single destination                                                                                                                       |
| Portofolio       | `/portofolio`   | No                | Single destination                                                                                                                       |
| Tentang          | `/tentang`      | Yes — 3 sub-items | Sub-pages: Filosofi · Tim · Sertifikasi                                                                                                  |
| Mulai Konsultasi | `/kontak`       | No                | CTA pill — gold background, ink text, 0px radius                                                                                         |

**Services dropdown spec**:

- Trigger: hover (desktop) / tap (touch devices)
- Appears: 200ms ease, translateY(-4px → 0) + opacity 0→1
- Background: `cream-50`, border: `1px solid ink-100`, no shadow
- Each item: service name (DM Sans 500, 14px) + 1-line descriptor (DM Sans 400, 12px, ink-500)
- Width: 240px, left-aligned to nav item

**Scroll behavior**:

- At top of page (hero): navbar background transparent, logo and links in `cream-50` (white on dark image)
- On scroll (>80px): background transitions to `cream-50` at 96% opacity with `backdrop-filter: blur(8px)`, border-bottom `1px solid ink-100` appears, logo and links switch to `ink-900`
- Transition: `all 200ms ease`

**Active state**: Current page nav link gets `1px underline` in `gold-warm`, offset 4px, `color: ink-900`

**Accessibility**:

- `<nav aria-label="Navigasi utama">`
- Dropdown: `aria-expanded`, `aria-haspopup`, keyboard `Enter`/`Space` to open, `Escape` to close
- Focus moves into dropdown on open, returns to trigger on close
- All links have visible focus ring: `2px solid gold-warm, offset 2px`

---

## §36 — Mobile Navigation Architecture

**Trigger**: Hamburger icon (top-right) — 3 lines, 24×18px, `ink-900`. Tap opens full-screen overlay.

**Overlay spec**:

- Background: `charcoal` (`#2b2926`), full viewport
- Animation: `translateX(100%) → translateX(0)`, 250ms ease-in-out
- Close: × button top-right OR swipe-left gesture

**Mobile menu structure** (top to bottom):

```
× [close]

Services                     ›  (accordion — expands inline)
  — Formulasi Custom
  — Private Label
  — Kemasan
  — Regulasi

Capabilities
Proses
Portofolio
Tentang                      ›  (accordion — expands inline)
  — Filosofi
  — Tim
  — Sertifikasi
Fasilitas
Jurnal
FAQ

─────────────────────────
[Mulai Konsultasi]   (full-width primary button, cream bg)
[Chat WhatsApp →]    (full-width secondary, gold text)
─────────────────────────
Instagram · LinkedIn
```

**Link typography**: DM Serif Display, 28px, `cream-50`, line-height 1.4, gap 28px

**Sub-items** (accordion): DM Sans 400, 16px, `cream-50` at 70%, padding-left 20px, gap 16px

**Accordion behavior**: Tap parent → rotates chevron (›) 90°, sub-items slide down, 200ms ease. Only one accordion open at a time.

**Focus trap**: When overlay is open, Tab cycles only within overlay elements. Focus returns to hamburger button on close.

**WhatsApp FAB**: Floating button bottom-right, 56×56px, `gold-warm` bg, WhatsApp icon `ink-900`. Appears 3s after page load. Hidden when contact form is in viewport (`IntersectionObserver`). Deep link: `wa.me/62XXXXXXXXXX?text=Halo+Haraka+Erfi%2C+saya+tertarik+berdiskusi+soal+maklon`

---

## §37 — Footer Architecture

### Layout: 4-column desktop / 2-column tablet / 1-column stacked mobile

```
Col 1 — Brand (3/12)          Col 2 — Layanan (3/12)       Col 3 — Perusahaan (3/12)     Col 4 — Kontak (3/12)
────────────────────────────────────────────────────────────────────────────────────────────────────────────────
[Logo — cream version]        LAYANAN                      PERUSAHAAN                    KONTAK
Mitra Manufaktur Kosmetik     Formulasi Custom             Tentang Kami                  Jl. [Alamat Lengkap]
Premium Indonesia             Private Label                Fasilitas                     [Kota, Kode Pos]
                              Desain & Kemasan             Proses Kerja                  info@harakaerfi.com
[Instagram] [LinkedIn]        Regulasi & Sertifikasi       Portofolio                    +62 XXX XXXX XXXX
                                                           Jurnal                        Senin–Jumat, 09.00–17.00 WIB
                                                           FAQ

────────────────────────────────────────────────────────────────────────────────────────────────────────────────
CERTIFICATIONS TRUST STRIP (hairline above, cream-50 at 8% opacity)
[BPOM] [CPKB] [ISO 22716] [Halal MUI]  — grayscale at 40% opacity
────────────────────────────────────────────────────────────────────────────────────────────────────────────────
© 2025 Haraka Erfi. Hak cipta dilindungi.                 Kebijakan Privasi · Syarat & Ketentuan
```

### Column Detail

**Col 1 — Brand**:

- Logo: cream variant, 28px height
- Tagline: DM Sans 400, 13px, `cream-50` at 50%, max-width 200px
- Social: Instagram + LinkedIn icons, 20px, `cream-50` at 60%, gap 16px, hover → 100% opacity
- No newsletter form here (avoids cluttering footer; lead magnet lives on `/proses` and `/jurnal`)

**Col 2 — Layanan** (links to service sub-pages):

- Formulasi Custom → `/services/formulasi-custom`
- Private Label → `/services/private-label`
- Desain & Kemasan → `/services/kemasan`
- Regulasi & Sertifikasi → `/services/regulasi`

**Col 3 — Perusahaan** (links to major pages):

- Tentang Kami → `/tentang`
- Fasilitas → `/fasilitas`
- Proses Kerja → `/proses`
- Portofolio → `/portofolio`
- Jurnal → `/jurnal`
- FAQ → `/faq`

**Col 4 — Kontak** (actionable contact info):

- Physical address (DM Sans 400, 13px, `cream-50` at 70%)
- Email (linked, hover: `gold-warm` underline)
- WhatsApp number (linked to `wa.me` deep link)
- Business hours (DM Mono 400, 11px, `cream-50` at 50%)

**Certifications strip**: Horizontal row of 4 certification logos, filter `grayscale(1) opacity(0.4)`. Sits between main footer grid and bottom bar. Background `cream-50` at 4% (very subtle). Padding `16px 0`.

**Bottom bar**: `border-top: 1px solid rgba(255,255,255,0.06)`, padding-top 24px, margin-top 40px.

- Left: copyright
- Right: Kebijakan Privasi · Syarat & Ketentuan (both linked to static utility pages)

**Structured data opportunity**: `Organization` JSON-LD schema embedded in footer area — includes name, url, logo, contactPoint, sameAs (Instagram, LinkedIn).

---

## §38 — CTA Strategy

### CTA Hierarchy Principles

1. Maximum **2 CTAs visible per viewport** — never compete with each other
2. Primary CTA always leads to `/kontak` or Calendly booking
3. Secondary CTA leads to depth (service page, portfolio, process) — keeps visitor in funnel if not ready to convert
4. CTA copy is **specific and outcome-oriented** — never "Klik Di Sini" or "Hubungi Kami" alone
5. **Action + benefit** formula: "Jadwalkan Konsultasi Gratis" not "Hubungi"

### Global Persistent CTAs

| Element      | Label              | Destination       | Condition                                              |
| ------------ | ------------------ | ----------------- | ------------------------------------------------------ |
| Navbar pill  | "Mulai Konsultasi" | `/kontak`         | Always visible on all pages                            |
| WhatsApp FAB | [WhatsApp icon]    | `wa.me` deep link | Mobile only, appears after 3s, hides near contact form |

### Per-Page CTA Map

| Page                 | Primary CTA                      | Destination              | Secondary CTA                | Destination              |
| -------------------- | -------------------------------- | ------------------------ | ---------------------------- | ------------------------ |
| `/`                  | "Mulai Konsultasi"               | `/kontak`                | "Lihat Portofolio"           | `/portofolio`            |
| `/services`          | "Konsultasi Gratis"              | `/kontak`                | Per-card "Pelajari →"        | `/services/[slug]`       |
| `/services/[slug]`   | "Ajukan Brief Formulasi"         | `/kontak?service=[slug]` | "Lihat Proses Lengkap"       | `/proses`                |
| `/capabilities`      | "Diskusikan Kebutuhan Anda"      | `/kontak`                | "Lihat Fasilitas"            | `/fasilitas`             |
| `/proses`            | "Jadwalkan Konsultasi Pertama"   | Calendly embed           | "Download Panduan Brand"     | Lead magnet (email gate) |
| `/portofolio`        | "Bangun Brand Anda Bersama Kami" | `/kontak`                | Case study cards →           | `/portofolio/[slug]`     |
| `/portofolio/[slug]` | "Mulai Perjalanan Brand Anda"    | `/kontak`                | "← Lihat Portofolio Lainnya" | `/portofolio`            |
| `/fasilitas`         | "Jadwalkan Kunjungan Fasilitas"  | `/kontak?intent=visit`   | "Lihat Sertifikasi"          | `/tentang/sertifikasi`   |
| `/tentang`           | "Mulai Konsultasi"               | `/kontak`                | "Lihat Fasilitas Kami"       | `/fasilitas`             |
| `/jurnal`            | "Download Panduan Brand"         | Lead magnet form         | Per-article "Baca →"         | `/jurnal/[slug]`         |
| `/jurnal/[slug]`     | "Konsultasikan Produk Anda"      | `/kontak`                | "Baca Artikel Lainnya"       | `/jurnal`                |
| `/faq`               | "Masih ada pertanyaan?"          | `/kontak`                | "Chat WhatsApp"              | `wa.me`                  |
| `/kontak`            | "Jadwalkan Konsultasi Gratis"    | Calendly embed           | "Kirim Pesan"                | Form submit              |

### Mid-Page In-Section CTAs (Homepage)

- After Trust Strip: none (no CTA competes with credibility signal)
- After Services Grid: "Tidak tahu layanan mana yang tepat? Konsultasi gratis →" (small text link)
- After How It Works: "Lihat Detail Proses →" (secondary text link)
- After Facility: "Lihat Fasilitas Selengkapnya →" (text link, gold color on dark bg)
- After Portfolio: "Lihat Semua Portofolio →" (text link)
- After Journal: "Lihat Semua Artikel →" (text link)
- Final CTA band: 2 CTAs (primary button + WhatsApp text link)

### A/B Test Candidates

| Variable            | Variant A                  | Variant B                            |
| ------------------- | -------------------------- | ------------------------------------ |
| Primary CTA label   | "Mulai Konsultasi"         | "Konsultasi Gratis Sekarang"         |
| Hero sub-CTA        | "Lihat Portofolio"         | "Lihat Proses Kami"                  |
| Process page CTA    | Calendly embed (immediate) | "Kirim Pertanyaan Dulu" (form first) |
| WhatsApp FAB timing | 3s delay                   | After 50% scroll depth               |
