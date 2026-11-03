"use client"

import { SectionLabel } from "@/components/ui/section-label"
import Link from "next/link"
import { motion } from "motion/react"

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.215, 0.61, 0.355, 1] as any },
  },
}

const staggerContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08 },
  },
}

export function ProductCategoriesSection() {
  const categories = [
    {
      name: "Skincare",
      description: "Cleanser, Toner, Serum, Moisturizer, Sunscreen, Masker, Essence",
      image: "/images/product-skincare.jpg",
      href: "https://wa.me/6283137030656?text=Hallo%20Admin%2C%20saya%20tertarik%20maklon%20produk%20Skincare%20di%20Haraka%20Erfi.%20Berapa%20MOQ-nya%20dan%20apa%20saja%20yang%20bisa%20dibuat%3F",
    },
    {
      name: "Bodycare",
      description: "Body Lotion, Body Scrub, Hand Cream, Body Wash, Body Butter",
      image: "/images/product-bodycare.jpg",
      href: "https://wa.me/6283137030656?text=Hallo%20Admin%2C%20saya%20tertarik%20maklon%20produk%20Body%20Care%20di%20Haraka%20Erfi.%20Berapa%20MOQ-nya%20dan%20apa%20saja%20yang%20bisa%20dibuat%3F",
    },
    {
      name: "Parfume",
      description: "Eau de Parfum, Eau de Toilette, Body Mist, Cologne, Scented Spray",
      image: "/images/product-parfume.jpg",
      href: "https://wa.me/6283137030656?text=Hallo%20Admin%2C%20saya%20tertarik%20maklon%20produk%20Parfum%20di%20Haraka%20Erfi.%20Berapa%20MOQ-nya%20dan%20apa%20saja%20varian%20yang%20tersedia%3F",
    },
    {
      name: "Haircare",
      description: "Shampoo, Conditioner, Hair Serum, Hair Mask, Hair Tonic, Hair Oil",
      image: "/images/product-haircare.jpg",
      href: "https://wa.me/6283137030656?text=Hallo%20Admin%2C%20saya%20tertarik%20maklon%20produk%20Hair%20Care%20di%20Haraka%20Erfi.%20Berapa%20MOQ-nya%20dan%20apa%20saja%20yang%20bisa%20dibuat%3F",
    },
  ]

  return (
    <section id="produk" className="section-padding-y bg-cream-50 scroll-mt-16 overflow-hidden">
      <div className="container-default">
        {/* Title */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={fadeInUp}
          className="mb-12 max-w-[680px] md:mb-16"
        >
          <SectionLabel>Kategori Produk</SectionLabel>
          <h2 className="text-ink-900 mb-4 font-sans text-3xl leading-tight font-bold tracking-tight sm:text-4xl md:text-5xl">
            Produk Kosmetik yang Dapat Kami Produksi
          </h2>
          <p className="text-ink-700 font-sans text-base leading-relaxed font-normal">
            Dari skincare hingga parfum mewah, kami memiliki keahlian formulasi dan fasilitas
            produksi berstandar CPKB untuk mewujudkan brand impian Anda.
          </p>
        </motion.div>

        {/* Grid Category Cards */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={staggerContainer}
          className="grid gap-6 md:grid-cols-2"
        >
          {categories.map((category, index) => (
            <motion.div key={index} variants={fadeInUp} className="w-full">
              <Link
                href={category.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group bg-navy border-border/60 hover:border-gold-warm/60 relative block aspect-[4/3] overflow-hidden rounded-2xl border shadow-sm transition-all duration-400 hover:shadow-xl sm:aspect-[3/2]"
              >
                {/* Image */}
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-out group-hover:scale-105"
                  style={{ backgroundImage: `url('${category.image}')` }}
                />

                {/* Gradient Overlay — Dark bottom gradient for crisp text contrast */}
                <div className="from-navy/95 via-navy/60 absolute inset-0 bg-gradient-to-t to-transparent transition-opacity duration-300" />

                {/* Content */}
                <div className="absolute inset-0 z-10 flex flex-col justify-end p-6 md:p-8">
                  <h3 className="group-hover:text-gold-warm mb-2 font-sans text-2xl leading-tight font-bold tracking-tight text-white! transition-colors duration-300 sm:text-3xl">
                    {category.name}
                  </h3>
                  <p className="text-cream-50! mb-4 font-sans text-sm leading-relaxed font-normal opacity-90 md:text-[15px]">
                    {category.description}
                  </p>
                  <span className="text-gold-warm inline-flex items-center gap-1.5 font-sans text-sm font-bold transition-all duration-200 group-hover:gap-2.5">
                    Konsultasi {category.name} <span aria-hidden="true">→</span>
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
