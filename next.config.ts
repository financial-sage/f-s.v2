import type { NextConfig } from "next";

const withPWA = require("next-pwa")({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  buildExcludes: [/middleware-manifest\.json$/],
});

const nextConfig: NextConfig = {
  turbopack: {},
  allowedDevOrigins: [
    "192.168.*.*",
    "192.168.1.19",
    "*.loca.lt",
    "*.trycloudflare.com",
    "*.tunnelmole.net",
  ],
};

export default withPWA(nextConfig);
