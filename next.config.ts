import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow development origins for cross-origin requests
  allowedDevOrigins: [
    "0836e2dd28b7.ngrok-free.app",
    // Add more ngrok or development domains as needed
    "*.ngrok-free.app",
    "*.ngrok.io",
    "localhost",
    "127.0.0.1",
  ],
  
  async headers() {
    return [
      {
        // Apply these headers to all routes
        source: "/(.*)",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "*", // Allow all origins
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, DELETE, OPTIONS, PATCH",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization, X-Requested-With, Accept, Origin, Cache-Control, X-File-Name",
          },
          {
            key: "Access-Control-Allow-Credentials",
            value: "true",
          },
          {
            key: "Access-Control-Max-Age",
            value: "86400", // 24 hours
          },
        ],
      },
    ];
  },
};

export default nextConfig;
