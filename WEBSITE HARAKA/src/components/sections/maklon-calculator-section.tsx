"use client"

import { useState } from "react"
import { SectionLabel } from "@/components/ui/section-label"
import { motion } from "motion/react"
import { Calculator, Check, ArrowRight, Sparkles } from "lucide-react"

const categories = [
  { id: "skincare", name: "Skincare", desc: "Serum, Cream, Toner, Cleanser" },
  { id: "bodycare", name: "Bodycare", desc: "Lotion, Scrub, Body Wash" },
  { id: "parfume", name: "Parfume", desc: "EDP, EDT, Body Mist" },
  { id: "haircare", name: "Haircare", desc: "Shampoo, Hair Serum, Masker" },
]

const quantities = [
  { id: "500", label: "500 pcs", tag: "Cocok Pemula" },
  { id: "1000", label: "1.000 pcs", tag: "Populer" },
  { id: "5000", label: "5.000+ pcs", tag: "Skala Besar" },
]

export function MaklonCalculatorSection() {
  const [selectedCategory, setSelectedCategory] = useState("skincare")
  const [selectedQuantity, setSelectedQuantity] = useState("1000")
  const [includeHalal, setIncludeHalal] = useState(true)
  const [includeDesign, setIncludeDesign] = useState(true)

  const currentCat = categories.find((c) => c.id === selectedCategory)
  const currentQty = quantities.find((q) => q.id === selectedQuantity)

  // Generate dynamic pre-filled WhatsApp text
  const waText = encodeURIComponent(
    `Halo Admin PT Haraka Erfi, saya ingin konsultasi estimasi maklon:\n\n` +
      `• Kategori: ${currentCat?.name}\n` +
      `• Quantitas: ${currentQty?.label}\n` +
      `• Notifikasi BPOM: Ya\n` +
      `• Sertifikasi Halal: ${includeHalal ? "Ya" : "Tidak"}\n` +
      `• Desain & Packaging: ${includeDesign ? "Ya" : "Tidak"}\n\n` +
      `Mohon info estimasi biaya dan tahapan sampel R&D selanjutnya. Terima kasih!`,
  )

  const waUrl = `https://wa.me/6283137030656?text=${waText}`

  return (
    <section
      id="kalkulator"
      className="section-padding-y bg-navy text-cream-50 scroll-mt-16 overflow-hidden"
    >
      <div className="container-default">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-12 max-w-[680px] md:mb-16"
        >
          <SectionLabel dark>Simulasi Interaktif</SectionLabel>
          <h2 className="text-cream-50 mb-4 font-sans text-3xl leading-tight font-bold tracking-tight sm:text-4xl md:text-5xl">
            Kalkulator Estimasi Maklon
          </h2>
          <p className="text-ink-300 font-sans text-base leading-relaxed font-normal">
            Hitung simulasi kebutuhan produksi brand Anda, dapatkan rincian estimasi, dan langsung
            hubungi admin via WhatsApp.
          </p>
        </motion.div>

        {/* Calculator Grid */}
        <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
          {/* Controls Column (8 Cols) */}
          <div className="space-y-8 lg:col-span-7">
            {/* Step 1: Category */}
            <div>
              <label className="text-gold-warm mb-3 block font-sans text-xs font-bold tracking-wider uppercase">
                1. Pilih Kategori Produk
              </label>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`rounded-xl border p-4 text-left transition-all duration-200 ${
                      selectedCategory === cat.id
                        ? "bg-gold-warm/15 border-gold-warm text-cream-50 shadow-md"
                        : "bg-navy-soft border-cream-50/10 text-ink-300 hover:border-cream-50/25"
                    }`}
                  >
                    <div className="text-cream-50 mb-1 flex items-center justify-between font-sans text-sm font-bold">
                      {cat.name}
                      {selectedCategory === cat.id && <Check className="text-gold-warm h-4 w-4" />}
                    </div>
                    <div className="text-ink-300 text-xs font-normal">{cat.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Quantity */}
            <div>
              <label className="text-gold-warm mb-3 block font-sans text-xs font-bold tracking-wider uppercase">
                2. Target Jumlah Pemesanan (MOQ)
              </label>
              <div className="grid grid-cols-3 gap-3">
                {quantities.map((qty) => (
                  <button
                    key={qty.id}
                    onClick={() => setSelectedQuantity(qty.id)}
                    className={`rounded-xl border p-4 text-center transition-all duration-200 ${
                      selectedQuantity === qty.id
                        ? "bg-gold-warm/15 border-gold-warm text-cream-50 shadow-md"
                        : "bg-navy-soft border-cream-50/10 text-ink-300 hover:border-cream-50/25"
                    }`}
                  >
                    <span className="text-gold-warm mb-1 block text-xs font-bold">{qty.tag}</span>
                    <div className="text-cream-50 font-sans text-base font-bold">{qty.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 3: Addons */}
            <div>
              <label className="text-gold-warm mb-3 block font-sans text-xs font-bold tracking-wider uppercase">
                3. Layanan Tambahan Legalitas & Desain
              </label>
              <div className="space-y-3">
                <div className="bg-navy-soft border-cream-50/10 flex items-center justify-between rounded-xl border p-4">
                  <div>
                    <div className="text-cream-50 font-sans text-sm font-bold">
                      Notifikasi Resmi BPOM
                    </div>
                    <div className="text-ink-300 text-xs">
                      Pendampingan pengurusan notifikasi izin edar BPOM
                    </div>
                  </div>
                  <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-400">
                    Wajib &amp; Termasuk
                  </span>
                </div>

                <button
                  onClick={() => setIncludeHalal(!includeHalal)}
                  className={`flex w-full items-center justify-between rounded-xl border p-4 text-left transition-all duration-200 ${
                    includeHalal
                      ? "bg-gold-warm/10 border-gold-warm/60 text-cream-50"
                      : "bg-navy-soft border-cream-50/10 text-ink-300"
                  }`}
                >
                  <div>
                    <div className="text-cream-50 font-sans text-sm font-bold">
                      Sertifikasi Halal MUI
                    </div>
                    <div className="text-ink-300 text-xs">
                      Pengurusan pendampingan sertifikat Halal
                    </div>
                  </div>
                  <div
                    className={`flex h-5 w-5 items-center justify-center rounded-md border ${includeHalal ? "bg-gold-warm border-gold-warm text-navy" : "border-cream-50/30"}`}
                  >
                    {includeHalal && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                  </div>
                </button>

                <button
                  onClick={() => setIncludeDesign(!includeDesign)}
                  className={`flex w-full items-center justify-between rounded-xl border p-4 text-left transition-all duration-200 ${
                    includeDesign
                      ? "bg-gold-warm/10 border-gold-warm/60 text-cream-50"
                      : "bg-navy-soft border-cream-50/10 text-ink-300"
                  }`}
                >
                  <div>
                    <div className="text-cream-50 font-sans text-sm font-bold">
                      Desain Logo &amp; Kemasan Premium
                    </div>
                    <div className="text-ink-300 text-xs">Layanan konseptor desain produk A-Z</div>
                  </div>
                  <div
                    className={`flex h-5 w-5 items-center justify-center rounded-md border ${includeDesign ? "bg-gold-warm border-gold-warm text-navy" : "border-cream-50/30"}`}
                  >
                    {includeDesign && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Result Card Column (5 Cols) */}
          <div className="lg:col-span-5">
            <div className="bg-navy-soft border-gold-warm/40 sticky top-24 space-y-6 rounded-2xl border p-6 shadow-2xl sm:p-8">
              <div className="border-cream-50/10 flex items-center justify-between border-b pb-4">
                <div className="flex items-center gap-2">
                  <Calculator className="text-gold-warm h-5 w-5" />
                  <span className="text-cream-50 font-sans text-sm font-bold">
                    Ringkasan Estimasi
                  </span>
                </div>
                <span className="text-gold-warm bg-gold-warm/15 border-gold-warm/30 rounded-full border px-2.5 py-1 text-[11px] font-bold">
                  ± 30 Hari Kerja
                </span>
              </div>

              {/* Summary Items */}
              <div className="space-y-3 font-sans text-sm">
                <div className="border-cream-50/5 flex justify-between border-b py-1">
                  <span className="text-ink-300">Kategori:</span>
                  <span className="text-cream-50 font-bold">{currentCat?.name}</span>
                </div>
                <div className="border-cream-50/5 flex justify-between border-b py-1">
                  <span className="text-ink-300">Jumlah Batch:</span>
                  <span className="text-gold-warm font-bold">{currentQty?.label}</span>
                </div>
                <div className="border-cream-50/5 flex justify-between border-b py-1">
                  <span className="text-ink-300">BPOM:</span>
                  <span className="font-bold text-emerald-400">Termasuk</span>
                </div>
                <div className="border-cream-50/5 flex justify-between border-b py-1">
                  <span className="text-ink-300">Halal:</span>
                  <span className="text-cream-50 font-bold">{includeHalal ? "Ya" : "Tidak"}</span>
                </div>
                <div className="border-cream-50/5 flex justify-between border-b py-1">
                  <span className="text-ink-300">Desain Kemasan:</span>
                  <span className="text-cream-50 font-bold">{includeDesign ? "Ya" : "Tidak"}</span>
                </div>
              </div>

              {/* Notice */}
              <div className="bg-gold-warm/10 border-gold-warm/20 text-cream-50/80 rounded-xl border p-4 text-xs leading-relaxed">
                <Sparkles className="text-gold-warm mb-1 h-4 w-4" />
                Estimasi biaya akurat akan dihitung langsung oleh tim R&amp;D sesuai bahan aktif dan
                spesifikasi wadah kemasan pilihan Anda.
              </div>

              {/* Action Button */}
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gold-warm hover:bg-gold-deep text-navy shadow-gold-warm/15 group flex h-14 w-full items-center justify-center gap-2.5 rounded-xl font-sans text-base font-bold shadow-lg transition-all duration-200 hover:text-white"
              >
                Kirim Rincian ke WhatsApp
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
