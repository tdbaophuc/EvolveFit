import type { NextConfig } from "next";

/**
 * Same-origin API proxy: the browser calls `/api/*` on the web domain and Next/Vercel forwards it to the API.
 * This keeps the session cookie first-party, so browsers that block third-party cookies (Safari/iOS, many
 * mobile browsers) still keep users signed in while the API lives on another domain (e.g. *.onrender.com).
 *
 * - API_PROXY_TARGET (server-only, read at build time): where `/api/*` is forwarded. Recommended in production,
 *   together with an empty NEXT_PUBLIC_API_BASE_URL so the browser uses relative `/api/...` URLs.
 * - NEXT_PUBLIC_API_BASE_URL: if set, the browser calls that origin directly (cross-site); kept as the proxy
 *   fallback for local development and CI.
 */
const proxyTarget = (process.env.API_PROXY_TARGET || process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/+$/, "");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@evolvefit/shared"],
  async rewrites() {
    if (!proxyTarget) return [];
    return [
      {
        source: "/api/:path*",
        destination: `${proxyTarget}/api/:path*`
      }
    ];
  }
};

export default nextConfig;
