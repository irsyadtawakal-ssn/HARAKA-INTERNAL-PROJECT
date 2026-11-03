"use client"

import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useReducedMotion } from "@/hooks/use-reduced-motion"
import { motion } from "motion/react"

export function HeroSection() {
  const prefersReducedMotion = useReducedMotion()

  const fadeInUp = {
    hidden: {
      opacity: prefersReducedMotion ? 1 : 0,
      y: prefersReducedMotion ? 0 : 20,
    },
    visible: (custom: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: prefersReducedMotion ? 0 : 0.6,
        delay: prefersReducedMotion ? 0 : custom * 0.12,
        ease: [0.215, 0.61, 0.355, 1] as any,
      },
    }),
  }

  return (
    <section
      id="hero"
      className="bg-navy relative flex min-h-[90vh] items-center overflow-hidden pt-16"
    >
      {/* Background Image — positioned on the right */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 lg:bg-right"
        style={{
          backgroundImage: "url('/images/pabrik-parfum-1.jpg')",
        }}
      />

      {/* Directional Overlay */}
      <div className="from-navy via-navy/95 to-navy/40 absolute inset-0 bg-gradient-to-r" />
      <div className="from-navy/80 to-navy/40 absolute inset-0 bg-gradient-to-t via-transparent" />

      {/* Content */}
      <div className="container-default relative z-10 py-24 md:py-32 lg:py-36">
        <div className="max-w-[640px]">
          {/* Trust Badge */}
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            custom={0}
            className="bg-gold-warm/15 border-gold-warm/30 mb-6 inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5"
          >
            <span className="bg-gold-warm h-1.5 w-1.5 rounded-full" />
            <span className="text-gold-warm font-sans text-xs font-bold tracking-wider uppercase">
              Pabrik Maklon Kosmetik • CPKB & BPOM
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            custom={1}
            className="text-cream-50 mb-6 font-sans text-3xl leading-[1.2] font-extrabold tracking-tight sm:text-4xl md:text-5xl lg:text-6xl"
          >
            Bangun Brand Kosmetikmu. <br className="hidden sm:inline" />
            <span className="text-gold-warm">Kami Urus Selebihnya.</span>
          </motion.h1>

          {/* Supporting Text */}
          <motion.p
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            custom={2}
            className="text-cream-50/85 mb-8 max-w-[540px] font-sans text-base leading-relaxed font-normal md:mb-10 md:text-lg"
          >
            Maklon skincare, bodycare, haircare, parfum, dan berbagai kategori kosmetik dengan
            layanan formulasi R&D, produksi massal, desain kemasan, hingga legalitas izin edar BPOM
            & Halal.
          </motion.p>

          {/* CTAs */}
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            custom={3}
            className="flex flex-col items-stretch gap-3.5 sm:flex-row sm:items-center"
          >
            <Button variant="primary" size="lg" className="font-sans font-bold" asChild>
              <Link
                href="https://wa.me/6283137030656?text=Hallo%20Admin%2C%20saya%20tertarik%20untuk%20memulai%20brand%20kosmetik%20sendiri.%20Bisa%20konsultasi%20gratis%3F"
                target="_blank"
                rel="noopener noreferrer"
              >
                Konsultasi Sekarang →
              </Link>
            </Button>
            <Button variant="outline_light" size="lg" className="font-sans font-semibold" asChild>
              <Link href="#prosedur">Lihat Prosedur ↓</Link>
            </Button>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
