import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import "./globals.css";

const serif = Cormorant_Garamond({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-serif" });
const sans = Manrope({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Tanya Rara · Haraka Erfi",
  description: "Asisten AI maklon kosmetik PT Haraka Erfi.",
};

// The on-screen keyboard shrinks the layout (not just the visual viewport), so the input bar stays above it.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body className={`${serif.variable} ${sans.variable}`}>{children}</body>
    </html>
  );
}
