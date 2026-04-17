import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "192.168.*.*",
    "192.168.1.19",
    "*.loca.lt",
    "*.trycloudflare.com",
    "*.tunnelmole.net",
  ],
};

export default nextConfig;
