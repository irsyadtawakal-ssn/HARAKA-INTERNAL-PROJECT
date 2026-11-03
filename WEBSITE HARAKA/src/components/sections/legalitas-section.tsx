"use client"

import { SectionLabel } from "@/components/ui/section-label"
import { motion } from "motion/react"
import { ShieldCheck, FileCheck, Award, CheckCircle2 } from "lucide-react"

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

export function LegalitasSection() {
  const legalItems = [
    {
      icon: ShieldCheck,
      title: "Notifikasi Kosmetik BPOM",
      description:
        "Pendampingan penuh proses notifikasi BPOM resmi sehingga produk Anda legal dan siap dipasarkan secara aman di Indonesia.",
    },
    {
      icon: Award,
      title: "Sertifikasi Halal MUI / BPJPH",
      description:
        "Pendampingan pengurusan sertifikasi Halal resmi untuk meningkatkan tingkat kepercayaan calon konsumen muslim.",
    },
    {
      icon: FileCheck,
      title: "Pendaftaran Merek (HAKI)",
      description:
        "Perlindungan hukum identitas merek dan logo brand kosmetik Anda dari risiko peniruan melalui pendaftaran Hak Cipta & Merek.",
    },
  ]

  return (
    <section id="legalitas" className="section-padding-y bg-cream-50 scroll-mt-16 overflow-hidden">
      <div className="container-default">
        {/* Title */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={fadeInUp}
          className="mb-12 max-w-[680px] md:mb-16"
        >
          <SectionLabel>Legalitas</SectionLabel>
          <h2 className="text-ink-900 mb-4 font-sans text-3xl leading-tight font-bold tracking-tight sm:text-4xl md:text-5xl">
            Pendampingan Legalitas & Izin Edar
          </h2>
          <p className="text-ink-700 font-sans text-base leading-relaxed font-normal">
            Kami mendampingi seluruh proses legalitas agar produk kosmetik Anda 100% legal, aman,
            dan siap dijual secara resmi.
          </p>
        </motion.div>

        {/* Cards */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={staggerContainer}
          className="grid gap-6 md:grid-cols-3"
        >
          {legalItems.map((item, index) => {
            const IconComponent = item.icon
            return (
              <motion.div
                key={index}
                variants={fadeInUp}
                className="group border-border/80 hover:border-gold-warm/60 flex flex-col justify-between rounded-2xl border bg-white p-7 transition-all duration-300 hover:shadow-xl md:p-8"
              >
                <div>
                  {/* Icon */}
                  <div className="bg-gold-pale/80 text-gold-deep group-hover:bg-gold-warm group-hover:text-navy mb-6 flex h-12 w-12 items-center justify-center rounded-xl transition-colors duration-300">
                    <IconComponent className="h-6 w-6" />
                  </div>

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

        {/* CPKB Trust Banner */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={fadeInUp}
          className="border-border/80 mt-12 flex flex-col items-center gap-5 rounded-2xl border bg-white p-6 text-center shadow-sm sm:flex-row sm:text-left md:p-8"
        >
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border border-emerald-200/50 bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <h4 className="text-ink-900 mb-1 font-sans text-lg font-bold">
              Pabrik Terakreditasi Standar CPKB
            </h4>
            <p className="text-ink-700 max-w-2xl font-sans text-sm leading-relaxed font-normal md:text-[15px]">
              Seluruh proses produksi kami mengikuti standar Cara Pembuatan Kosmetik yang Baik
              (CPKB) sesuai regulasi ketat BPOM Republik Indonesia.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
