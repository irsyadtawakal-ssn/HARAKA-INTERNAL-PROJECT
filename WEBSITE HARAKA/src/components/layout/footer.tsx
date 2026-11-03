import Link from "next/link"
import Image from "next/image"

export function Footer() {
  return (
    <footer id="kontak" className="bg-navy border-cream-50/5 scroll-mt-16 border-t">
      <div className="container-default py-12 md:py-16 lg:py-20">
        {/* Footer Grid */}
        <div className="space-y-10 md:space-y-12 lg:grid lg:grid-cols-12 lg:gap-12 lg:space-y-0">
          {/* Brand Section */}
          <div className="space-y-5 lg:col-span-5">
            <Link href="/" className="inline-block">
              <Image
                src="/images/logo-harakaerfi.jpg"
                alt="PT Haraka Erfi Kosmetindo Abadi"
                width={120}
                height={120}
                className="h-20 w-20 rounded-xl object-contain"
              />
            </Link>
            <p className="text-ink-300 max-w-md text-sm leading-relaxed md:text-[15px]">
              PT Haraka Erfi adalah Unit Usaha dari Hakara Manufacturing. Kami Manajemen PT Haraka
              siap memberikan pelayanan terbaik dengan jaminan kepuasan pelanggan secara optimal.
            </p>
          </div>

          {/* Layanan Links */}
          <div className="lg:col-span-3">
            <h3 className="text-gold-warm mb-4 font-mono text-[11px] tracking-widest uppercase">
              Layanan Maklon
            </h3>
            <ul className="space-y-3">
              {[
                { label: "Maklon Skincare", text: "Skincare" },
                { label: "Maklon Bodycare", text: "Body%20Care" },
                { label: "Maklon Parfum", text: "Parfum" },
                { label: "Maklon Haircare", text: "Hair%20Care" },
              ].map((item) => (
                <li key={item.label}>
                  <Link
                    href={`https://wa.me/6283137030656?text=Hallo%20Admin%20Saya%20Ingin%20Maklon%20${item.text}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-ink-300 hover:text-cream-50 block py-1 text-sm transition-colors"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Kontak Details */}
          <div className="lg:col-span-4">
            <h3 className="text-gold-warm mb-4 font-mono text-[11px] tracking-widest uppercase">
              Contact Info
            </h3>
            <address className="text-ink-300 space-y-4 text-sm not-italic">
              <div>
                <span className="text-gold-pale mb-1 block font-mono text-[10px] tracking-widest uppercase">
                  Head Office
                </span>
                <p className="leading-relaxed">
                  PT HARAKA MULTIFAEDAH
                  <br />
                  Jl. Raya Cimatis No. 80, Kel. Jatikarya, Kec. Jatisampurna, Bekasi
                  <br />
                  <span className="text-cream-50/40 text-xs">
                    (Belakang Plaza Cibubur, Dekat Citra Grand)
                  </span>
                </p>
              </div>
              <div className="space-y-2">
                <p>
                  <span className="text-gold-pale mb-0.5 block font-mono text-[10px] tracking-widest uppercase">
                    Customer Service
                  </span>
                  <a
                    href="https://wa.me/6283137030656?text=Hallo%20Admin%2C%20saya%20ingin%20bertanya%20mengenai%20layanan%20Haraka%20Erfi.%20Bisa%20dibantu%3F"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-cream-50 transition-colors"
                  >
                    0831-3703-0656
                  </a>
                </p>
                <p>
                  <span className="text-gold-pale mb-0.5 block font-mono text-[10px] tracking-widest uppercase">
                    Telepon Kantor
                  </span>
                  <a href="tel:02139733633" className="hover:text-cream-50 transition-colors">
                    021-39733633
                  </a>
                </p>
                <p>
                  <span className="text-gold-pale mb-0.5 block font-mono text-[10px] tracking-widest uppercase">
                    Email
                  </span>
                  <a
                    href="mailto:info@harakamultifaedah.co.id"
                    className="hover:text-cream-50 transition-colors"
                  >
                    info@harakamultifaedah.co.id
                  </a>
                </p>
              </div>
            </address>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="border-cream-50/5 mt-10 flex flex-col items-center justify-between gap-4 border-t pt-6 md:mt-12 md:flex-row md:pt-8">
          <p className="text-cream-50/40 text-xs">
            © Copyright 2024 - 2026 PT Haraka Erfi. All Rights Reserved.
          </p>
          <div className="text-cream-50/40 flex gap-6 text-xs">
            <Link href="/#tentang" className="hover:text-cream-50/60 py-1 transition-colors">
              Tentang
            </Link>
            <Link href="/#produk" className="hover:text-cream-50/60 py-1 transition-colors">
              Produk
            </Link>
            <Link href="/#layanan" className="hover:text-cream-50/60 py-1 transition-colors">
              Layanan
            </Link>
            <Link href="/#prosedur" className="hover:text-cream-50/60 py-1 transition-colors">
              Prosedur
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
