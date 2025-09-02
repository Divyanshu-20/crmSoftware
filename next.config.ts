import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable CSP for development to allow Paddle iframe
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'ALLOWALL'
          }
        ]
      }
    ];
  }
};

export default nextConfig;
