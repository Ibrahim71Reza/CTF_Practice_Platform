import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tell Next.js 15 App Router to leave these packages alone
  serverExternalPackages: ["firebase-admin", "jose", "jwks-rsa"],
  
  // Force Webpack to completely ignore firebase-admin during the Vercel build
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push("firebase-admin");
    }
    return config;
  },
};

export default nextConfig;