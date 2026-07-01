import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tell Next.js to leave these packages alone
  serverExternalPackages: ["firebase-admin", "jose", "jwks-rsa"],
  
  // Force Webpack to completely ignore firebase-admin during the Vercel build
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push("firebase-admin");
    }
    return config;
  },

  // Silence the Next.js 16 Turbopack warning during local dev
  turbopack: {},
};

export default nextConfig;