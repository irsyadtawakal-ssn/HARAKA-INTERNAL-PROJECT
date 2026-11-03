"use client"

import { SectionLabel } from "@/components/ui/section-label"
import { motion } from "motion/react"

export function ReasonsSection() {
  const reasons = [
    {
      num: "01",
      title: "Lebih Mudah",
      description:
        "Anda tidak perlu ribet mengurusi segalanya sendirian. Cukup duduk manis dan pantau perkembangan bisnis Anda dari jauh selagi kami memproses produk Anda.",
      image: "https://harakaerfi.com/wp-content/uploads/2024/04/Easy.png",
    },
    {
      num: "02",
      title: "Hemat Biaya",
      description:
        "Kami menyediakan seluruh kebutuhan produksi satu pintu ( R&D, desain, kemasan, sertifikasi ), yang jauh lebih hemat daripada mendirikan pabrik atau melakukannya sendiri.",
      image: "https://harakaerfi.com/wp-content/uploads/2024/04/Low-cost.png",
    },
    {
      num: "03",
      title: "Efisien",
      description:
        "Kami membantu bisnis Anda dari formulasi awal hingga produk siap didistribusikan. Anda dapat fokus penuh membangun strategi brand, pemasaran, dan penjualan produk.",
      image: "https://harakaerfi.com/wp-content/uploads/2024/04/Efisien.png",
    },
  ]

  const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: [0.215, 0.61, 0.355, 1] as any },
    },
  }

  const staggerContainer = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  return (
    <section id="alasan" className="section-padding-y bg-cream-50 scroll-mt-16 overflow-hidden">
      <div className="container-default">
        {/* Title & Stats Intro with Repeat Scroll Animation */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, amount: 0.15 }}
          variants={fadeInUp}
          className="mx-auto mb-16 max-w-[760px] text-center md:mb-24"
        >
          <SectionLabel>Mengapa Mulai Sekarang?</SectionLabel>
          <h2 className="text-ink-900 mb-6 font-serif text-3xl leading-tight sm:text-4xl md:text-5xl">
            3 Alasan Paling Logis Kenapa Anda Harus Segera Bikin Brand Kosmetik Sendiri
          </h2>
          <p className="text-ink-700 mx-auto mb-8 max-w-2xl font-sans text-base leading-relaxed font-light md:text-lg">
            Tahukah Anda? Industri Kosmetik dan Skincare memiliki pertumbuhan yang sangat stabil.
            Artinya, sekarang adalah kesempatan emas bagi Anda untuk mengambil peluang bisnis
            kecantikan bersama kami!
          </p>
          <div className="bg-gold-warm/60 mx-auto h-px w-16" />
        </motion.div>

        {/* 3 Columns Cards Layout with Repeat Scroll Anim */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, amount: 0.1 }}
          variants={staggerContainer}
          className="mx-auto grid max-w-[1120px] gap-8 md:grid-cols-3"
        >
          {reasons.map((reason, index) => (
            <motion.div
              key={index}
              variants={fadeInUp}
              className="group hover:border-gold-warm/40 flex transform flex-col items-center justify-between rounded-3xl border border-slate-200/50 bg-white p-8 text-center shadow-sm transition-all duration-500 hover:-translate-y-1.5 hover:shadow-xl md:p-10"
            >
              <div className="flex flex-col items-center">
                {/* Illustration Image in elegant circle backdrop */}
                <div className="bg-gold-pale border-gold-warm/20 group-hover:border-gold-warm/40 mb-6 flex h-24 w-24 items-center justify-center rounded-full border shadow-inner transition-colors duration-300">
                  <img
                    src={reason.image}
                    alt={reason.title}
                    className="h-12 w-12 object-contain grayscale filter transition-all duration-500 ease-out group-hover:scale-110 group-hover:grayscale-0"
                  />
                </div>

                <div className="text-gold-deep mb-3 font-mono text-sm font-semibold tracking-widest">
                  ALASAN {reason.num}
                </div>

                <h3 className="text-ink-900 group-hover:text-gold-deep mb-4 font-serif text-xl font-normal transition-colors duration-200 sm:text-2xl">
                  {reason.title}
                </h3>

                <p className="text-ink-700 font-sans text-sm leading-relaxed font-light sm:text-base">
                  {reason.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
