"use client"

import { SectionLabel } from "@/components/ui/section-label"
import * as Accordion from "@radix-ui/react-accordion"
import { ChevronDown, HelpCircle } from "lucide-react"
import { motion } from "motion/react"

const faqs = [
  {
    q: "Berapa minimal order (MOQ) maklon di PT Haraka Erfi?",
    a: "Jumlah Minimum Pemesanan (MOQ) di Haraka Erfi sangat fleksibel, mulai dari 1000 pcs. Fasilitas ini kami hadirkan khusus untuk mempermudah perintis brand baru & wirausaha UMKM agar dapat meluncurkan produk tanpa beban modal awal yang besar.",
  },
  {
    q: "Berapa lama estimasi total dari pembuatan sampel hingga produk siap jual?",
    a: "Estimasi total dari acc sampel hingga produk siap jual kurang lebih 3 bulan. Setelah sampel disetujui, produk masuk proses pendaftaran BPOM, finalisasi desain kemasan, dan produksi massal — seluruh tahapan ini membutuhkan waktu sekitar 3 bulan agar produk Anda 100% legal dan siap dipasarkan.",
  },
  {
    q: "Apakah izin edar BPOM dan sertifikasi Halal diurus sepenuhnya?",
    a: "Ya, betul! Tim legalitas kami mendampingi seluruh proses pendaftaran notifikasi resmi BPOM, pengurusan sertifikasi Halal, serta pendaftaran merek (HAKI) sehingga produk Anda 100% legal dan aman dijual bebas.",
  },
  {
    q: "Bagaimana jika saya belum punya formula atau desain kemasan sama sekali?",
    a: "Tenang saja! Kami adalah partner konseptor A-Z. Tim R&D kami akan membuatkan sampel formula custom sesuai bahan aktif impian Anda, dan tim desainer kami akan merancang konsep logo serta wadah kemasan yang menarik di pasaran.",
  },
  {
    q: "Apakah sampel produk bisa direvisi jika aromanya atau teksturnya belum cocok?",
    a: "Tentu bisa! Tim R&D kami memberikan kesempatan revisi sampel hingga tekstur, aroma, warna, dan khasiat formula 100% cocok dengan keinginan dan persetujuan Anda sebelum masuk lini produksi massal.",
  },
]

export function FAQSection() {
  return (
    <section id="faq" className="section-padding-y bg-cream-50 scroll-mt-16 overflow-hidden">
      <div className="container-default">
        <div className="grid gap-10 lg:grid-cols-12 lg:items-start">
          {/* Header (4 Cols) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-4"
          >
            <SectionLabel>Tanya Jawab</SectionLabel>
            <h2 className="text-ink-900 mb-4 font-sans text-3xl leading-tight font-bold tracking-tight sm:text-4xl">
              Pertanyaan Sering Diajukan
            </h2>
            <p className="text-ink-700 mb-6 font-sans text-base leading-relaxed font-normal">
              Temukan jawaban seputar prosedur maklon, minimal order, hingga legalitas BPOM &amp;
              Halal.
            </p>
            <div className="bg-cream border-border/80 flex items-start gap-3 rounded-2xl border p-5">
              <HelpCircle className="text-gold-deep mt-0.5 h-5 w-5 flex-shrink-0" />
              <div className="text-ink-700 font-sans text-sm leading-relaxed">
                Ada pertanyaan lain? <br />
                <a
                  href="https://wa.me/6283137030656?text=Hallo%20Admin%20Saya%20Ingin%20Tanya%20Seputar%20Maklon"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gold-deep hover:text-navy font-bold underline transition-colors"
                >
                  Tanyakan langsung ke Admin WA →
                </a>
              </div>
            </div>
          </motion.div>

          {/* Accordion (8 Cols) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-8"
          >
            <Accordion.Root type="single" collapsible className="space-y-4">
              {faqs.map((faq, index) => (
                <Accordion.Item
                  key={index}
                  value={`item-${index}`}
                  className="border-border/80 data-[state=open]:border-gold-warm/60 overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-200 data-[state=open]:shadow-md"
                >
                  <Accordion.Header className="flex">
                    <Accordion.Trigger className="text-ink-900 hover:text-gold-deep group flex flex-1 items-center justify-between p-6 text-left font-sans text-base font-bold transition-colors md:text-lg">
                      <span>{faq.q}</span>
                      <ChevronDown className="text-ink-500 group-data-[state=open]:text-gold-deep ml-4 h-5 w-5 flex-shrink-0 transition-transform duration-300 group-data-[state=open]:rotate-180" />
                    </Accordion.Trigger>
                  </Accordion.Header>
                  <Accordion.Content className="text-ink-700 border-border/40 mt-1 border-t px-6 pt-0 pt-4 pb-6 font-sans text-sm leading-relaxed font-normal md:text-base">
                    {faq.a}
                  </Accordion.Content>
                </Accordion.Item>
              ))}
            </Accordion.Root>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
