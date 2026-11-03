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

const staggerContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06 },
  },
}

export function CapabilitiesSection() {
  const capabilities = [
    {
      title: "Pengembangan Formula & Sampel",
      description:
        "Pengembangan formulasi sampel oleh tim R&D profesional, disesuaikan dengan bahan aktif, aroma, dan tekstur keinginan Anda.",
      image: "/images/formula-sampel.jpg",
    },
    {
      title: "Konsep & Desain Produk",
      description:
        "Layanan desain logo, kemasan produk, dan konsep branding eksklusif dari A-Z untuk memastikan brand Anda tampil menonjol.",
      image: "/images/konsep-desain.jpg",
    },
    {
      title: "Solusi Kemasan & Sourcing",
      description:
        "Konsultasi desain packaging dan sourcing kemasan berkualitas tinggi sesuai konsep produk impian Anda.",
      image: "/images/kemasan-sourcing.jpg",
    },
    {
      title: "Manufaktur CPKB & QC Ketat",
      description:
        "Seluruh produk diproduksi di pabrik berstandar CPKB (Cara Pembuatan Kosmetik yang Baik) dengan Quality Control ketat.",
      image: "/images/pabrik-produksi.jpg",
    },
  ]

  return (
    <section id="layanan" className="section-padding-y bg-cream scroll-mt-16 overflow-hidden">
      <div className="container-default">
        {/* Title */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={fadeInUp}
          className="mb-12 max-w-[680px] md:mb-16"
        >
          <SectionLabel>Layanan Kami</SectionLabel>
          <h2 className="text-ink-900 mb-4 font-sans text-3xl leading-tight font-bold tracking-tight sm:text-4xl md:text-5xl">
            Layanan End-to-End dalam Satu Tempat
          </h2>
          <p className="text-ink-700 font-sans text-base leading-relaxed font-normal">
            Dari formulasi R&D, desain kemasan, hingga manufaktur skala besar, kami menyediakan
            solusi satu pintu untuk brand Anda.
          </p>
        </motion.div>

        {/* Cards Grid */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.05 }}
          variants={staggerContainer}
          className="grid gap-6 sm:grid-cols-2"
        >
          {capabilities.map((item, index) => (
            <motion.div
              key={index}
              variants={fadeInUp}
              className="group border-border/80 hover:border-gold-warm/60 flex flex-col overflow-hidden rounded-2xl border bg-white transition-all duration-300 hover:shadow-xl"
            >
              {/* Image — Full Cover Fit */}
              <div className="border-border/40 bg-cream-200 relative aspect-[16/10] w-full overflow-hidden border-b sm:h-64">
                <img
                  src={item.image}
                  alt={item.title}
                  className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  loading="lazy"
                />
              </div>

              {/* Content */}
              <div className="flex flex-1 flex-col justify-between p-7 md:p-8">
                <div>
                  <span className="text-gold-deep mb-2.5 block font-sans text-xs font-bold tracking-wider uppercase">
                    Layanan 0{index + 1}
                  </span>
                  <h3 className="text-ink-900 group-hover:text-gold-deep mb-3 font-sans text-xl leading-snug font-bold tracking-tight transition-colors duration-200">
                    {item.title}
                  </h3>
                  <p className="text-ink-700 font-sans text-sm leading-relaxed font-normal md:text-[15px]">
                    {item.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
