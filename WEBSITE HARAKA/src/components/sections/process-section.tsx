"use client"

import { SectionLabel } from "@/components/ui/section-label"
import { Button } from "@/components/ui/button"
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

export function ProcessSection() {
  const steps = [
    {
      label: "Konsultasi Ide & Konsep Produk",
      description:
        "Diskusikan visi brand, target pasar, bahan aktif utama, serta target harga jual produk impian Anda bersama tim representatif kami.",
    },
    {
      label: "Pembuatan Formula & Sampel",
      description:
        "Tim R&D berpengalaman kami mengembangkan formula khusus sesuai permintaan. Sampel akan dikirimkan untuk evaluasi Anda.",
    },
    {
      label: "Approval Formula Final",
      description:
        "Revisi sampel jika diperlukan. Setelah formula disetujui, kami melakukan finalisasi spesifikasi bahan dan kemasan.",
    },
    {
      label: "Registrasi Legalitas (BPOM & Halal)",
      description:
        "Seluruh kelengkapan dokumen pendaftaran BPOM, sertifikasi Halal, serta pendaftaran merek diurus langsung oleh tim regulasi kami.",
    },
    {
      label: "Produksi Skala Penuh (CPKB)",
      description:
        "Setelah izin edar terbit, pabrik kami memulai produksi massal menggunakan mesin otomatis canggih berstandar CPKB.",
    },
    {
      label: "Quality Control & Pengiriman",
      description:
        "Produk dikemas rapi dengan QC ketat, lalu dikirim aman ke gudang Anda untuk langsung siap dijual ke pasar.",
    },
  ]

  return (
    <section id="prosedur" className="section-padding-y bg-navy scroll-mt-16 overflow-hidden">
      <div className="container-default">
        {/* Title */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={fadeInUp}
          className="mb-12 max-w-[680px] md:mb-16"
        >
          <SectionLabel dark>Prosedur Maklon</SectionLabel>
          <h2 className="text-cream-50 mb-4 font-sans text-3xl leading-tight font-bold tracking-tight sm:text-4xl md:text-5xl">
            6 Tahapan Mudah Maklon di Haraka Erfi
          </h2>
          <p className="text-ink-300 font-sans text-base leading-relaxed font-normal">
            Sistem maklon kami dirancang transparan dan efisien dari tahap ide awal hingga produk
            tiba di tempat Anda.
          </p>
        </motion.div>

        {/* Process Timeline */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={staggerContainer}
          className="mb-14 space-y-8 md:mb-20 md:space-y-10"
        >
          {steps.map((step, index) => (
            <motion.div
              key={index}
              variants={fadeInUp}
              className="group lg:grid lg:grid-cols-12 lg:items-start lg:gap-10"
            >
              <div className="mb-2 flex items-center gap-3 lg:col-span-4 lg:mb-0 lg:block">
                <span className="text-gold-warm mb-1 font-sans text-xs font-bold tracking-wider uppercase lg:block">
                  Langkah 0{index + 1}
                </span>
                <h3 className="text-cream-50 group-hover:text-gold-warm font-sans text-xl leading-snug font-bold tracking-tight transition-colors duration-200">
                  {step.label}
                </h3>
              </div>
              <div className="border-cream-50/15 group-hover:border-gold-warm/60 border-l-2 pl-5 transition-colors duration-300 lg:col-span-8 lg:pl-6">
                <p className="text-ink-300 max-w-[600px] font-sans text-sm leading-relaxed font-normal md:text-base">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA Callout */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={fadeInUp}
          className="bg-navy-soft border-cream-50/10 mx-auto max-w-2xl rounded-2xl border p-8 text-center md:p-12"
        >
          <span className="text-gold-warm mb-2 block font-sans text-sm font-bold tracking-wider uppercase">
            Mulai Sekarang
          </span>
          <h3 className="text-cream-50 mb-6 font-sans text-xl leading-relaxed font-bold tracking-tight sm:text-2xl">
            Segera wujudkan brand kosmetik impian Anda bersama PT Haraka Erfi.
          </h3>
          <Button variant="primary" size="lg" className="font-sans font-bold" asChild>
            <Link
              href="https://wa.me/6283137030656?text=Hallo%20Admin%2C%20saya%20sudah%20lihat%20prosedur%20maklonnya%20dan%20ingin%20mulai.%20Gimana%20langkah%20pertamanya%3F"
              target="_blank"
              rel="noopener noreferrer"
            >
              Konsultasi Maklon via WhatsApp →
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  )
}
