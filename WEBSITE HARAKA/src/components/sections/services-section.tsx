import { SectionLabel } from "@/components/ui/section-label"

export function ServicesSection() {
  const services = [
    {
      title: "Private Label",
      description:
        "Pilih formula ready-made dari katalog kami dan produksi dengan brand Anda sendiri. MOQ fleksibel, proses cepat.",
    },
    {
      title: "Custom Formula",
      description:
        "Kembangkan formula unik sesuai konsep brand Anda. Tim R&D kami siap mewujudkan ide Anda menjadi produk nyata.",
    },
    {
      title: "Contract Manufacturing",
      description:
        "Manufaktur lengkap dari produksi hingga packaging. Kami handle seluruh proses produksi sesuai standar internasional.",
    },
    {
      title: "Packaging Solutions",
      description:
        "Konsultasi design packaging dan sourcing kemasan berkualitas. Kami bantu Anda temukan kemasan yang tepat.",
    },
  ]

  return (
    <section className="section-padding-y bg-cream-50">
      <div className="container-default">
        <div className="mb-12 max-w-[640px] md:mb-20 md:max-w-[720px]">
          <SectionLabel>Layanan Kami</SectionLabel>
          <h2 className="text-ink-900 mb-6 font-serif text-3xl leading-[1.15] sm:text-4xl md:mb-8 md:text-5xl">
            Solusi manufaktur kosmetik yang sesuai kebutuhan brand Anda
          </h2>
        </div>

        {/* Mobile-Optimized Editorial List */}
        <div className="space-y-10 md:space-y-12 lg:grid lg:grid-cols-2 lg:gap-12 lg:space-y-0 xl:gap-20">
          {services.map((service, index) => (
            <div key={index} className="group">
              <h3 className="text-ink-900 mb-4 font-serif text-xl leading-tight sm:text-2xl md:mb-6 md:text-3xl">
                {service.title}
              </h3>
              <p className="text-ink-700 mb-4 max-w-[520px] text-base leading-relaxed md:mb-6 md:text-lg">
                {service.description}
              </p>
              <div className="bg-ink-100 group-hover:bg-gold-warm h-px transition-colors duration-300" />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
