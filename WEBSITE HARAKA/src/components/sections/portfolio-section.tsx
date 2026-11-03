"use client"

import { SectionLabel } from "@/components/ui/section-label"
import { motion } from "motion/react"

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.215, 0.61, 0.355, 1] as any },
  },
}

export function PortfolioSection() {
  const brandImages = [
    { src: "/images/brands/narsis.jpeg", alt: "Narsis" },
    { src: "/images/brands/versident.jpeg", alt: "Versident" },
    { src: "/images/brands/pherini.jpeg", alt: "Pherini" },
    { src: "/images/brands/nature-reaction.jpeg", alt: "Nature Reaction" },
    { src: "/images/brands/hassya-premiere.jpeg", alt: "Hassya Premiere" },
    { src: "/images/brands/eloni.jpeg", alt: "Eloni" },
    { src: "/images/brands/umyka.jpeg", alt: "Umyka Beauty Glow" },
    { src: "/images/brands/djunichol.jpeg", alt: "Djunichol Skincare" },
    { src: "/images/brands/art-glow.jpeg", alt: "Art Glow" },
    { src: "/images/brands/barmen.jpeg", alt: "Barmen" },
    { src: "/images/brands/thipank.jpeg", alt: "Thipank" },
    { src: "/images/brands/cloris-men.jpeg", alt: "Cloris Men" },
    { src: "/images/brands/sakura-kanaai.jpeg", alt: "Sakura Kanaai" },
    { src: "/images/brands/ahel-skincare.jpeg", alt: "Ahel Skincare" },
    { src: "/images/brands/zammit.jpeg", alt: "Zammit" },
    { src: "/images/brands/epelskin.jpeg", alt: "EpelSkin" },
    { src: "/images/brands/ascha-beauty.jpeg", alt: "Ascha Beauty" },
    { src: "/images/brands/dgekira.jpeg", alt: "D'Gekira Parfume" },
  ]

  const marqueeImages = [...brandImages, ...brandImages, ...brandImages]

  return (
    <section id="portofolio" className="section-padding-y bg-cream-50 scroll-mt-16 overflow-hidden">
      <div className="container-default">
        {/* Header */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={fadeInUp}
          className="mb-12 max-w-[680px] md:mb-16"
        >
          <SectionLabel>Portofolio</SectionLabel>
          <h2 className="text-ink-900 mb-4 font-sans text-3xl leading-tight font-bold tracking-tight sm:text-4xl md:text-5xl">
            Dipercaya oleh Berbagai Brand Skincare & Kosmetik
          </h2>
          <p className="text-ink-700 font-sans text-base leading-relaxed font-normal">
            Berikut adalah beberapa produk dari brand mitra kami yang sukses meluncur dan mendapat
            respons luar biasa di pasar kecantikan digital.
          </p>
        </motion.div>
      </div>

      {/* Infinite Scrolling Marquee */}
      <div className="border-border/40 relative w-full overflow-hidden border-y bg-white py-8 select-none">
        {/* Edge Fades */}
        <div className="from-cream-50 pointer-events-none absolute top-0 bottom-0 left-0 z-10 w-16 bg-gradient-to-r to-transparent md:w-32" />
        <div className="from-cream-50 pointer-events-none absolute top-0 right-0 bottom-0 z-10 w-16 bg-gradient-to-l to-transparent md:w-32" />

        <div className="animate-marquee flex items-center gap-6">
          {marqueeImages.map((brand, index) => (
            <div
              key={index}
              className="border-border/40 hover:border-gold-warm/60 relative h-36 w-36 flex-shrink-0 rounded-2xl border bg-white p-2.5 shadow-sm transition-all duration-300 md:h-44 md:w-44"
            >
              <img
                src={brand.src}
                alt={brand.alt}
                className="pointer-events-none h-full w-full rounded-xl object-contain transition-all duration-500"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Clean Quote Block */}
      <div className="container-default mt-14 md:mt-20">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={fadeInUp}
          className="border-border/80 mx-auto max-w-3xl rounded-2xl border bg-white p-8 text-center shadow-sm md:p-14"
        >
          <h3 className="text-ink-900 mb-4 font-sans text-xl leading-snug font-bold tracking-tight sm:text-2xl md:text-3xl">
            &ldquo;Kami siap membantu Anda dari perancangan konsep produk dari{" "}
            <span className="text-gold-deep font-serif font-normal italic">A sampai Z</span> hingga
            jadi sesuai keinginan Anda.&rdquo;
          </h3>

          <div className="bg-gold-warm/60 mx-auto mb-4 h-px w-12" />

          <p className="text-ink-700 mx-auto max-w-xl font-sans text-sm leading-relaxed font-normal md:text-base">
            Fokuskan waktu Anda pada strategi branding dan pemasaran, sementara urusan formulasi dan
            manufaktur kami eksekusi secara profesional.
          </p>
        </motion.div>
      </div>
    </section>
  )
}
