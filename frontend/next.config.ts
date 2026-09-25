import type { NextConfig } from "next";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const nextConfig: NextConfig = {
  // Next.js option: do not auto-create an extra rules file (AGENTS.md) in this folder
  agentRules: false,

  images: {
    // <Image> may load photos only from our backend's /uploads folder
    remotePatterns: [new URL(API_URL + "/uploads/**")],

    // Next.js 16 blocks images from local addresses (localhost) by default.
    // Allow it ONLY while developing, because our backend runs on localhost.
    dangerouslyAllowLocalIP: process.env.NODE_ENV === "development",
  },
};

export default nextConfig;
