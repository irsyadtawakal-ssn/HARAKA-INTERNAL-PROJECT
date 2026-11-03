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

export function IntroSection() {
  return (
    <section id="tentang" className="section-padding-y bg-cream scroll-mt-16 overflow-hidden">
      <div className="container-default">
        <div className="space-y-12 lg:grid lg:grid-cols-12 lg:items-center lg:gap-16 lg:space-y-0 xl:gap-20">
          {/* Text Content */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={fadeInUp}
            className="lg:col-span-6"
          >
            <SectionLabel>Tentang Kami</SectionLabel>

            <h2 className="text-ink-900 mb-6 font-sans text-3xl leading-tight font-bold tracking-tight sm:text-4xl md:text-5xl">
              Partner Maklon dari Ide{" "}
              <span className="text-gold-deep font-serif font-normal italic">
                Hingga Produk Siap Jual.
              </span>
            </h2>

            <div className="text-ink-700 max-w-[540px] space-y-5 font-sans text-base leading-relaxed font-normal">
              <p>
                PT Haraka Erfi merupakan unit usaha manufaktur kosmetik terintegrasi di bawah
                naungan{" "}
                <strong className="text-ink-900 font-semibold">PT Haraka Multifaedah</strong>, yang
                telah berpengalaman menjual berbagai macam jenis kosmetik sejak tahun 2015.
              </p>
              <p>
                Kami bukan hanya sekadar pabrik maklon produksi, melainkan partner strategis dan
                konseptor produk Anda. Kami mendampingi proses dari hulu ke hilir: mulai dari riset
                bahan aktif, perancangan formula, desain kemasan, hingga legalitas izin edar.
              </p>
            </div>

            {/* Compact Trust Points */}
            <div className="mt-8 mb-8 flex flex-wrap gap-8">
              <div>
                <div className="text-ink-900 font-sans text-3xl font-extrabold">2015+</div>
                <div className="text-ink-500 mt-1 font-sans text-xs font-bold tracking-wider uppercase">
                  Berpengalaman
                </div>
              </div>
              <div className="bg-border w-px" />
              <div>
                <div className="text-ink-900 font-sans text-3xl font-extrabold">CPKB</div>
                <div className="text-ink-500 mt-1 font-sans text-xs font-bold tracking-wider uppercase">
                  Standar Produksi
                </div>
              </div>
              <div className="bg-border w-px" />
              <div>
                <div className="text-ink-900 font-sans text-3xl font-extrabold">R&D</div>
                <div className="text-ink-500 mt-1 font-sans text-xs font-bold tracking-wider uppercase">
                  Formulasi Khusus
                </div>
              </div>
            </div>

            <Link
              href="#prosedur"
              className="text-gold-deep hover:text-navy inline-flex items-center gap-2 font-sans text-base font-bold transition-colors"
            >
              Lihat Prosedur Maklon Kami <span aria-hidden="true">→</span>
            </Link>
          </motion.div>

          {/* Image Collage */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            variants={fadeInUp}
            className="grid grid-cols-2 gap-3 lg:col-span-6"
          >
            <div className="space-y-3">
              <div className="bg-cream-200 relative aspect-[4/3] overflow-hidden rounded-2xl shadow-sm">
                <img
                  src="/images/pabrik-parfum-1.jpg"
                  alt="Laboratorium R&D PT Haraka Erfi"
                  className="h-full w-full object-cover transition-transform duration-700 ease-out hover:scale-105"
                  loading="lazy"
                />
              </div>
              <div className="bg-cream-200 relative aspect-square overflow-hidden rounded-2xl shadow-sm">
                <img
                  src="/images/pabrik-parfum-2.jpg"
                  alt="Mesin pengisian kosmetik"
                  className="h-full w-full object-cover transition-transform duration-700 ease-out hover:scale-105"
                  loading="lazy"
                />
              </div>
            </div>
            <div className="space-y-3 pt-8">
              <div className="bg-cream-200 relative aspect-square overflow-hidden rounded-2xl shadow-sm">
                <img
                  src="/images/pabrik-produksi.jpg"
                  alt="Mesin pengemasan produk"
                  className="h-full w-full object-cover transition-transform duration-700 ease-out hover:scale-105"
                  loading="lazy"
                />
              </div>
              <div className="bg-cream-200 relative aspect-[4/3] overflow-hidden rounded-2xl shadow-sm">
                <img
                  src="/images/manufaktur-cpkb.jpg"
                  alt="Produk kosmetik Haraka Erfi"
                  className="h-full w-full object-cover transition-transform duration-700 ease-out hover:scale-105"
                  loading="lazy"
                />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
