import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // This tells Vercel's bundler to completely ignore firebase-admin and its crypto dependencies!
  serverExternalPackages: ["firebase-admin", "jose", "jwks-rsa"],
  
  // Silences the local dev warning
  turbopack: {},
};

export default nextConfig;