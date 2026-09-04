import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@evolvefit/shared"],
  async rewrites() {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
    if (!apiBaseUrl) return [];
    return [
      {
        source: "/api/:path*",
        destination: `${apiBaseUrl.replace(/\/+$/, "")}/api/:path*`
      }
    ];
  }
};

export default nextConfig;
