import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Explicit Turbopack root to avoid Next.js inferring workspace root from other lockfiles
  turbopack: {
    root: './',
  },
};

export default nextConfig;
