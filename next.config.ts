import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // This tells Vercel's bundler to leave firebase-admin alone!
  serverExternalPackages: ["firebase-admin"],
};

export default nextConfig;