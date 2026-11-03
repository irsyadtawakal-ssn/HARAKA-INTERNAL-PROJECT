"use client"

import { SectionLabel } from "@/components/ui/section-label"
import { motion } from "motion/react"
import { Zap, Sliders, Users, Star, Award, HeartHandshake } from "lucide-react"

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

export function WhyHarakaSection() {
  const differentiators = [
    {
      icon: Zap,
      title: "Pelayanan Responsif & Cepat",
      description:
        "Akses cepat seputar perkembangan sampel dan jadwal produksi maklon tanpa waktu tunggu yang lama.",
    },
    {
      icon: Sliders,
      title: "Kustomisasi Formula Bebas",
      description:
        "Bebas menentukan bahan aktif, tekstur, aroma, warna, hingga bentuk kemasan didampingi tim R&D ahli.",
    },
    {
      icon: Users,
      title: "MOQ Fleksibel untuk UMKM",
      description:
        "Jumlah minimum pemesanan (MOQ) bersahabat, dirancang khusus untuk mempermudah perintis brand baru.",
    },
    {
      icon: Star,
      title: "Benefit Exclusive Partner",
      description:
        "Prioritas antrean produksi, diskon volume bertahap, dan pendampingan konsultasi bisnis berkelanjutan.",
    },
    {
      icon: Award,
      title: "Standar CPKB & BPOM Resmi",
      description:
        "Jaminan kualitas produk aman dan tersertifikasi resmi sesuai standar Pembuatan Kosmetik yang Baik.",
    },
    {
      icon: HeartHandshake,
      title: "Pendampingan Bisnis A-Z",
      description:
        "Bimbingan teknis dan konsultasi pengembangan brand kosmetik Anda secara transparan dari awal hingga lulus uji pasar.",
    },
  ]

  return (
    <section id="mengapa" className="section-padding-y bg-cream scroll-mt-16 overflow-hidden">
      <div className="container-default">
        {/* Section Header */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={fadeInUp}
          className="mb-12 max-w-[680px] md:mb-16"
        >
          <SectionLabel>Mengapa Kami</SectionLabel>
          <h2 className="text-ink-900 mb-4 font-sans text-3xl leading-tight font-bold tracking-tight sm:text-4xl md:text-5xl">
            Keunggulan Maklon di PT Haraka Erfi
          </h2>
          <p className="text-ink-700 font-sans text-base leading-relaxed font-normal">
            Fokus utama kami adalah kecepatan eksekusi, kustomisasi tinggi, dan fleksibilitas
            layanan untuk membantu brand kosmetik Anda berkembang pesat.
          </p>
        </motion.div>

        {/* 6 Cards Grid (Balanced 3x2) */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={staggerContainer}
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
        >
          {differentiators.map((item, index) => {
            const IconComponent = item.icon
            return (
              <motion.div
                key={index}
                variants={fadeInUp}
                className="group border-border/80 hover:border-gold-warm/60 relative flex flex-col justify-between rounded-2xl border bg-white p-7 transition-all duration-300 hover:shadow-xl md:p-8"
              >
                <div>
                  {/* Top Bar with Icon & Step Badge */}
                  <div className="mb-6 flex items-center justify-between">
                    <div className="bg-gold-pale/80 text-gold-deep group-hover:bg-gold-warm group-hover:text-navy flex h-12 w-12 items-center justify-center rounded-xl transition-colors duration-300">
                      <IconComponent className="h-6 w-6" />
                    </div>
                    <span className="text-ink-500 bg-cream-100 border-border/40 rounded-full border px-3 py-1 font-sans text-xs font-bold tracking-wider">
                      0{index + 1}
                    </span>
                  </div>

                  {/* Card Title & Description */}
                  <h3 className="text-ink-900 group-hover:text-gold-deep mb-3 font-sans text-xl leading-snug font-bold tracking-tight transition-colors duration-200">
                    {item.title}
                  </h3>
                  <p className="text-ink-700 font-sans text-sm leading-relaxed font-normal md:text-[15px]">
                    {item.description}
                  </p>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
