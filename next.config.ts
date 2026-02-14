import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "c21bd90516d4b8e0e211589986418803.r2.cloudflarestorage.com",
      },
    ],
    localPatterns: [
      {
        pathname: "/**",
      },
      {
        pathname: "/api/media",
      },
    ],
  },
};

export default nextConfig;
