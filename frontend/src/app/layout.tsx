import type { Metadata } from "next";
import { Instrument_Sans } from "next/font/google";
import "./globals.css";

const instrument = Instrument_Sans({
  variable: "--font-instrument",
  subsets: ["latin"],
  axes: ["wdth"],
});

export const metadata: Metadata = {
  title: { default: "Marketing Factory", template: "%s | Marketing Factory" },
  description: "Dashboard internal Haraka Erfi AI Marketing Factory",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${instrument.variable} h-full antialiased`}>
      <body className="min-h-full font-sans text-[15px] leading-relaxed">{children}</body>
    </html>
  );
}
