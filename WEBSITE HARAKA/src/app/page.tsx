import { HeroSection } from "@/components/sections/hero-section"
import { TrustStrip } from "@/components/sections/trust-strip"
import { IntroSection } from "@/components/sections/intro-section"
import { ProductCategoriesSection } from "@/components/sections/product-categories-section"
import { CapabilitiesSection } from "@/components/sections/capabilities-section"
import { LegalitasSection } from "@/components/sections/legalitas-section"
import { WhyHarakaSection } from "@/components/sections/why-haraka-section"
import { PortfolioSection } from "@/components/sections/portfolio-section"
import { ProcessSection } from "@/components/sections/process-section"
import { FAQSection } from "@/components/sections/faq-section"
import { CTABand } from "@/components/sections/cta-band"
import { WhatsAppWidget } from "@/components/ui"
import { SocialProofToast } from "@/components/ui/social-proof-toast"

export default function HomePage() {
  return (
    <main>
      <HeroSection />
      <TrustStrip />
      <IntroSection />
      <ProductCategoriesSection />
      <CapabilitiesSection />
      <LegalitasSection />
      <WhyHarakaSection />
      <PortfolioSection />
      <ProcessSection />
      <FAQSection />
      <CTABand
        eyebrow="Siap Memulai?"
        headline="Siap Punya Brand Kosmetik Sendiri?"
        subtext="Mulai dari ide, formula, hingga produk siap dipasarkan — konsultasikan kebutuhan brand Anda bersama tim Haraka Erfi."
        primaryCTA={{
          label: "Konsultasi via WhatsApp →",
          href: "https://wa.me/6283137030656?text=Hallo%20Admin%2C%20saya%20siap%20memulai%20brand%20kosmetik%20saya%20bersama%20Haraka%20Erfi.%20Bisa%20mulai%20dari%20mana%3F",
        }}
      />
      <WhatsAppWidget />
      <SocialProofToast />
    </main>
  )
}
