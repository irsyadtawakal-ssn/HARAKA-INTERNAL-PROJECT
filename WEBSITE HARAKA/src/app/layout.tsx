import type { Metadata } from "next"
import { Plus_Jakarta_Sans, Playfair_Display } from "next/font/google"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { ScrollProgress } from "@/components/ui/scroll-progress"
import { FacebookPixel } from "@/components/analytics/facebook-pixel"
import "@/styles/globals.css"

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
})

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
})

export const metadata: Metadata = {
  title: {
    default: "Haraka Erfi — Mitra Manufaktur Kosmetik Premium Indonesia",
    template: "%s — Haraka Erfi",
  },
  description:
    "Contract manufacturing kosmetik terpercaya di Indonesia. Formulasi custom, private label, kemasan, dan dukungan regulasi BPOM & Halal. MOQ fleksibel, sertifikasi lengkap.",
  keywords: [
    "maklon kosmetik Indonesia",
    "contract manufacturing kosmetik",
    "private label skincare",
    "formulasi kosmetik custom",
    "BPOM certified",
    "halal cosmetics manufacturing",
  ],
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: "https://harakaerfi.com",
    siteName: "Haraka Erfi",
    title: "Haraka Erfi — Mitra Manufaktur Kosmetik Premium Indonesia",
    description:
      "Contract manufacturing kosmetik terpercaya di Indonesia dengan sertifikasi lengkap dan dukungan end-to-end.",
  },
  robots: {
    index: true,
    follow: true,
  },
  manifest: "/site.webmanifest",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id" className={`${plusJakartaSans.variable} ${playfairDisplay.variable}`}>
      <body>
        <FacebookPixel />
        <ScrollProgress />
        <Navbar />
        {children}
        <Footer />
      </body>
    </html>
  )
}
