import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Use Turbopack (stable in Next.js 16)
  // Enabled via --turbopack flag in dev script

  images: {
    formats: ["image/avif", "image/webp"],
    // Add production image domains here when known
    remotePatterns: [],
  },

  // Strict mode for catching potential issues early
  reactStrictMode: true,

  // React Compiler disabled for now (requires babel-plugin-react-compiler)
  // reactCompiler: true,
}

export default nextConfig
