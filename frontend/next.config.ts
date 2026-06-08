import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path((?!auth).*$)",
        destination: "http://localhost:8080/api/:path*",
      },
    ];
  },
};

export default nextConfig;
