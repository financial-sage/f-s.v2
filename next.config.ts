import type { NextConfig } from "next";

/**
 * Baked into the client so UpdateNotifier can detect a new deploy.
 * Prefer the Vercel commit SHA so every production build gets a fresh version
 * even if NEXT_PUBLIC_APP_VERSION is left static in the project env.
 */
const appVersion =
  process.env.VERCEL_GIT_COMMIT_SHA?.trim()?.slice(0, 7) ||
  process.env.NEXT_PUBLIC_APP_VERSION?.trim() ||
  "dev";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: appVersion,
  },
  turbopack: {},
  allowedDevOrigins: [
    "127.0.0.1",
    "localhost",
    "192.168.*.*",
    "192.168.1.19",
    "*.loca.lt",
    "*.trycloudflare.com",
    "*.tunnelmole.net",
  ],
  async headers() {
    return [
      {
        source: "/manifest.json",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/icons/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
        ],
      },
    ];
  },
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
    // Registration is handled by PWARegister (also primes Web Push).
    register: false,
    skipWaiting: true,
    // Appends worker/index.js (importScripts push handlers) to the generated SW.
    customWorkerDir: "worker",
    buildExcludes: [/middleware-manifest\.json$/],
  });
  exportedConfig = withPWA(nextConfig);
}

export default exportedConfig;
