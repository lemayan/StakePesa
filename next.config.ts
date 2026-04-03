import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    dangerouslyAllowSVG: true,
    remotePatterns: [
      // Wikimedia CDN — for politician photos
      { protocol: "https", hostname: "upload.wikimedia.org" },
      // DiceBear — for AI-generated avatars
      { protocol: "https", hostname: "api.dicebear.com" },
      // Google profile photos
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "**.googleusercontent.com" },
    ],
  },
};

export default nextConfig;
