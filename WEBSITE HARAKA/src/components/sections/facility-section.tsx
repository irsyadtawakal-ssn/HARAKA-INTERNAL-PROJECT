import { SectionLabel } from "@/components/ui/section-label"
import { cn } from "@/lib/utils"

export function FacilitySection() {
  const images = [
    {
      src: "https://images.unsplash.com/photo-1582719471384-894fbb16e074?q=80&w=1000",
      alt: "Laboratorium Formulasi",
      label: "Laboratorium",
    },
    {
      src: "https://images.unsplash.com/photo-1585435557343-3b092031a831?q=80&w=1000",
      alt: "Lantai Produksi",
      label: "Produksi",
    },
    {
      src: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?q=80&w=1000",
      alt: "Quality Control",
      label: "Quality Control",
    },
  ]

  return (
    <section className="section-padding-y bg-cream-50">
      <div className="container-default">
        <div className="space-y-8 lg:grid lg:grid-cols-12 lg:items-start lg:gap-12 lg:space-y-0 xl:gap-20">
          {/* Mobile-First Text */}
          <div className="lg:col-span-4">
            <SectionLabel>Fasilitas</SectionLabel>
            <h2 className="text-ink-900 mb-6 font-serif text-3xl leading-[1.15] sm:text-4xl md:mb-8 md:text-5xl">
              Produksi berskala dengan standar laboratorium
            </h2>
            <p className="text-ink-700 max-w-[520px] text-base leading-relaxed md:text-lg">
              Fasilitas manufaktur modern dengan sertifikasi CPKB dan ISO 22716. Setiap produk
              diproduksi dalam lingkungan terkontrol untuk hasil konsisten.
            </p>
          </div>

          {/* Mobile-Optimized Images */}
          <div className="lg:col-span-8">
            {/* Mobile: Single Column Stack */}
            <div className="space-y-2 sm:hidden">
              {images.map((image, index) => (
                <div key={index} className="bg-cream-200 relative aspect-[3/2] overflow-hidden">
                  <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url('${image.src}')` }}
                  />
                  <div className="from-ink-900/60 absolute right-0 bottom-0 left-0 bg-gradient-to-t to-transparent p-4">
                    <span className="text-cream-50 font-mono text-xs tracking-wider uppercase">
                      {image.label}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Tablet+: Editorial Grid */}
            <div className="hidden gap-2 sm:grid sm:grid-cols-2 lg:grid-cols-3">
              {images.map((image, index) => (
                <div
                  key={index}
                  className={cn(
                    "bg-cream-200 relative overflow-hidden",
                    index === 0
                      ? "aspect-square sm:col-span-2 lg:col-span-1 lg:aspect-[4/5]"
                      : index === 1
                        ? "aspect-[3/2] sm:aspect-square"
                        : "aspect-[3/2] sm:col-span-2 sm:aspect-square lg:col-span-1 lg:aspect-[4/5]",
                  )}
                >
                  <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url('${image.src}')` }}
                  />
                  <div className="from-ink-900/60 absolute right-0 bottom-0 left-0 bg-gradient-to-t to-transparent p-4">
                    <span className="text-cream-50 font-mono text-xs tracking-wider uppercase">
                      {image.label}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
