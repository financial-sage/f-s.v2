import type { NextConfig } from "next";

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

// next-pwa injects a webpack plugin. Wrapping the config during `next dev`
// (Turbopack) breaks App Router route resolution and causes 404s on valid pages.
// Only enable the PWA wrapper for production builds.
const isProd = process.env.NODE_ENV === "production";

let exportedConfig: NextConfig = nextConfig;

if (isProd) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const withPWA = require("next-pwa")({
    dest: "public",
    disable: false,
    register: true,
    skipWaiting: true,
    buildExcludes: [/middleware-manifest\.json$/],
  });
  exportedConfig = withPWA(nextConfig);
}

export default exportedConfig;
