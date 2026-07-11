import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep Firebase Admin on the Node.js runtime path for Vercel functions.
  serverExternalPackages: ["firebase-admin"],
  
  // Silences the local dev warning
  turbopack: {},
};

export default nextConfig;
