import type { NextConfig } from "next";

const backendUrl = process.env.BACKEND_API_URL || "http://localhost:8080";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path((?!auth/login|auth/logout|auth/me$|auth/register).*$)",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
