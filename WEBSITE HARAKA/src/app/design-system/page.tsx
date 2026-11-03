import { Button } from "@/components/ui/button"
import { SectionLabel } from "@/components/ui/section-label"
import { StatBlock } from "@/components/ui/stat-block"
import { ServiceCard } from "@/components/ui/service-card"
import { ProcessStep } from "@/components/ui/process-step"
import { CTABand } from "@/components/sections/cta-band"

export default function DesignSystemPage() {
  return (
    <main className="py-24">
      {/* Typography */}
      <section className="container-default section-padding-y">
        <SectionLabel>Typography System</SectionLabel>
        <h1 className="display-xl text-primary mb-6">
          Display XL: Mitra Manufaktur Kosmetik Premium
        </h1>
        <h2 className="display-lg text-primary mb-6">
          Display LG: Formulasi Tersertifikasi untuk Brand Anda
        </h2>
        <h3 className="display-md text-primary mb-6">Display MD: Dari Ide ke Produk Berkualitas</h3>
        <h4 className="heading-xl text-primary mb-6">
          Heading XL: Proses Manufaktur yang Terpercaya
        </h4>
        <h5 className="heading-lg text-primary mb-6">Heading LG: Dukungan Regulasi Lengkap</h5>
        <h6 className="heading-md text-primary mb-6">Heading MD: Kapasitas Produksi Fleksibel</h6>
        <p className="body-lg text-secondary mb-4">
          Body Large: Haraka Erfi adalah partner manufaktur kosmetik terpercaya di Indonesia dengan
          sertifikasi lengkap dan dukungan end-to-end.
        </p>
        <p className="body-md text-secondary mb-4">
          Body Medium: Kami menyediakan layanan formulasi custom, private label, desain kemasan, dan
          dukungan regulasi BPOM & Halal untuk brand Anda.
        </p>
        <p className="body-sm text-secondary mb-4">
          Body Small: MOQ fleksibel mulai dari 500 pcs, lead time 8–12 minggu, dan konsultasi gratis
          untuk brand owner baru.
        </p>
        <p className="caption mb-8">Caption: Sertifikasi ISO 22716:2007, BPOM, CPKB, Halal MUI</p>
        <span className="label mb-4 block">Label: Kategori Produk</span>
        <span className="eyebrow block">— Section Eyebrow</span>
      </section>

      <div className="divider" />

      {/* Colors */}
      <section className="container-default section-padding-y">
        <SectionLabel>Color System</SectionLabel>
        <h2 className="heading-xl mb-8">Cream & Ink + Warm Gold</h2>
        <div className="grid-4 mb-12">
          <div>
            <div className="bg-cream-50 border-ink-100 mb-2 h-24 border" />
            <p className="caption">cream-50 (page bg)</p>
          </div>
          <div>
            <div className="bg-cream-100 border-ink-100 mb-2 h-24 border" />
            <p className="caption">cream-100 (alt bg)</p>
          </div>
          <div>
            <div className="bg-ink-900 mb-2 h-24" />
            <p className="caption">ink-900 (text)</p>
          </div>
          <div>
            <div className="bg-charcoal mb-2 h-24" />
            <p className="caption">charcoal (dark)</p>
          </div>
          <div>
            <div className="bg-gold-warm mb-2 h-24" />
            <p className="caption">gold-warm (accent)</p>
          </div>
          <div>
            <div className="bg-gold-deep mb-2 h-24" />
            <p className="caption">gold-deep (hover)</p>
          </div>
          <div>
            <div className="bg-gold-pale border-ink-100 mb-2 h-24 border" />
            <p className="caption">gold-pale (tint)</p>
          </div>
          <div>
            <div className="bg-ink-500 mb-2 h-24" />
            <p className="caption">ink-500 (muted)</p>
          </div>
        </div>
      </section>

      <div className="divider" />

      {/* Buttons */}
      <section className="container-default section-padding-y">
        <SectionLabel>Buttons</SectionLabel>
        <h2 className="heading-xl mb-8">4 Variants × 3 Sizes</h2>
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-4">
            <Button variant="primary" size="lg">
              Primary Large
            </Button>
            <Button variant="primary" size="default">
              Primary Default
            </Button>
            <Button variant="primary" size="sm">
              Primary Small
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Button variant="secondary" size="lg">
              Secondary Large
            </Button>
            <Button variant="secondary" size="default">
              Secondary Default
            </Button>
            <Button variant="secondary" size="sm">
              Secondary Small
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Button variant="pill" size="lg">
              Pill Large
            </Button>
            <Button variant="pill" size="default">
              Pill Default
            </Button>
            <Button variant="pill" size="sm">
              Pill Small
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Button variant="ghost" size="lg">
              Ghost Link →
            </Button>
            <Button variant="ghost" size="default">
              Ghost Link →
            </Button>
            <Button variant="ghost" size="sm">
              Ghost Link →
            </Button>
          </div>
        </div>
      </section>

      <div className="divider" />

      {/* Stats */}
      <section className="container-default section-padding-y">
        <SectionLabel>Statistics</SectionLabel>
        <h2 className="heading-xl mb-8">Large Numbers + Labels</h2>
        <div className="grid-3">
          <StatBlock value="1,200+" label="Formulas" subtext="Ready-made and custom" />
          <StatBlock value="500 pcs" label="Minimum Order" subtext="Test run available" />
          <StatBlock value="8–12 wks" label="Avg. Lead Time" subtext="From formula to shelf" />
        </div>
      </section>

      <div className="divider" />

      {/* Service Cards */}
      <section className="container-default section-padding-y">
        <SectionLabel>Service Cards</SectionLabel>
        <h2 className="heading-xl mb-8">Numbered Cards with Accent Border</h2>
        <div className="grid-4">
          <ServiceCard
            number="01"
            title="Formulasi Custom"
            description="Kembangkan formula unik sesuai visi brand Anda dengan dukungan R&D kami."
            href="/services/formulasi-custom"
          />
          <ServiceCard
            number="02"
            title="Private Label"
            description="Pilih dari ratusan formula ready-made dan langsung produksi dengan brand Anda."
            href="/services/private-label"
          />
          <ServiceCard
            number="03"
            title="Desain & Kemasan"
            description="Konsultasi packaging design dan sourcing kemasan berkualitas premium."
            href="/services/kemasan"
          />
          <ServiceCard
            number="04"
            title="Regulasi BPOM"
            description="Kami dampingi proses registrasi BPOM dan sertifikasi Halal untuk produk Anda."
            href="/services/regulasi"
          />
        </div>
      </section>

      <div className="divider" />

      {/* Process Steps */}
      <section className="bg-charcoal section-padding-y">
        <div className="container-default">
          <SectionLabel dark>Process Timeline</SectionLabel>
          <h2 className="heading-xl text-cream-50 mb-12">
            Dari Ide ke Produk, Kami Pandu Setiap Langkah
          </h2>
          <div className="grid-4">
            <ProcessStep
              number="01"
              label="Konsultasi"
              description="Diskusi visi brand, target market, dan requirement produk Anda."
            />
            <ProcessStep
              number="02"
              label="Formulasi"
              description="Tim R&D kami develop formula sesuai brief dan lakukan uji stabilitas."
            />
            <ProcessStep
              number="03"
              label="Produksi"
              description="Produksi skala penuh dengan quality control ketat di setiap tahap."
            />
            <ProcessStep
              number="04"
              label="Peluncuran"
              description="Produk siap diluncurkan dengan sertifikasi lengkap dan kemasan final."
            />
          </div>
        </div>
      </section>

      <div className="divider" />

      {/* CTA Band */}
      <CTABand
        eyebrow="Siap Memulai?"
        headline="Bangun Brand Anda Bersama Kami"
        subtext="Konsultasi pertama gratis. Kami akan membantu Anda memahami proses, biaya, dan waktu produksi."
        primaryCTA={{
          label: "Jadwalkan Konsultasi",
          href: "/kontak",
        }}
        secondaryCTA={{
          label: "Atau hubungi via WhatsApp",
          href: "https://wa.me/62XXXXXXXXXX",
        }}
      />
    </main>
  )
}
