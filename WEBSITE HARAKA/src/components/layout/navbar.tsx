"use client"

import Link from "next/link"
import { useScrolled } from "@/hooks/use-scrolled"
import { cn } from "@/lib/utils"
import { Menu, X } from "lucide-react"
import { useState } from "react"
import { Logo } from "@/components/ui/logo"
import { trackWhatsAppClick } from "@/lib/facebook-pixel"

const navLinks = [
  { label: "Tentang", href: "/#tentang" },
  { label: "Produk", href: "/#produk" },
  { label: "Layanan", href: "/#layanan" },
  { label: "Mengapa Kami", href: "/#mengapa" },
  { label: "Proses", href: "/#prosedur" },
  { label: "Kontak", href: "/#kontak" },
]

export function Navbar() {
  const scrolled = useScrolled(80)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <>
      <nav
        className={cn(
          "fixed top-0 z-50 w-full transition-all duration-300",
          scrolled
            ? "border-border border-b bg-white/95 shadow-sm backdrop-blur-md"
            : "bg-transparent",
        )}
      >
        <div className="container-default flex h-16 items-center justify-between md:h-[72px]">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <Logo
              variant={scrolled ? "dark" : "white"}
              size="md"
              className="transition-all duration-300"
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden items-center gap-8 lg:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "font-sans text-[14px] font-medium tracking-wide transition-colors",
                  scrolled
                    ? "text-ink-700 hover:text-ink-900 font-semibold"
                    : "text-cream-50/85 hover:text-cream-50 font-medium",
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* CTA */}
          <div className="hidden lg:block">
            <Link
              href="https://wa.me/6283137030656?text=Hallo%20Admin%2C%20saya%20ingin%20konsultasi%20maklon%20kosmetik.%20Bisa%20bantu%20saya%3F"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackWhatsAppClick("navbar-desktop")}
              className={cn(
                "inline-flex h-10 items-center gap-1.5 rounded-lg px-5 font-sans text-[13px] font-bold transition-all duration-200",
                scrolled
                  ? "bg-gold-warm text-navy hover:bg-gold-deep hover:text-white"
                  : "bg-gold-warm text-navy hover:bg-gold-deep hover:text-white",
              )}
            >
              Konsultasi
              <span aria-hidden="true">→</span>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={cn(
              "-mr-3 p-3 transition-colors lg:hidden",
              scrolled ? "text-ink-900" : "text-cream-50",
            )}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="bg-navy fixed inset-0 z-40 lg:hidden">
          <div className="container-default flex min-h-screen flex-col pt-20 pb-8">
            <nav className="flex flex-1 flex-col gap-5">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-cream-50 hover:text-gold-warm py-2 font-sans text-2xl font-bold tracking-tight transition-colors md:text-3xl"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="border-cream-50/10 mt-auto border-t pt-6">
              <Link
                href="https://wa.me/6283137030656?text=Hallo%20Admin%2C%20saya%20ingin%20konsultasi%20maklon%20kosmetik.%20Bisa%20bantu%20saya%3F"
                onClick={() => {
                  setMobileMenuOpen(false)
                  trackWhatsAppClick("navbar-mobile")
                }}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gold-warm text-navy hover:bg-gold-deep flex h-14 w-full items-center justify-center gap-2 rounded-lg font-sans text-base font-bold transition-colors hover:text-white"
              >
                Konsultasi via WhatsApp
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
