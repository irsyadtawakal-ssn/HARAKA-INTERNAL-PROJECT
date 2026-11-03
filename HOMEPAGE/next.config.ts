import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The chat route reads the knowledge file at runtime; make sure Vercel ships it.
  outputFileTracingIncludes: {
    "/api/chat": ["./lib/knowledge/**/*"],
  },
};

export default nextConfig;
