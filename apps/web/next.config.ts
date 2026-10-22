import type { NextConfig } from "next";
import path from "node:path";

// Resolve the monorepo root (two levels up from apps/web)
const monorepoRoot = path.resolve(__dirname, "../..");

const nextConfig: NextConfig = {
  // Explicit empty turbopack config silences the "no turbopack config" build warning.
  // Setting `root` resolves the multiple-lockfiles workspace detection warning.
  turbopack: {
    root: monorepoRoot,
  },
  // Required for correct output file tracing in a monorepo
  outputFileTracingRoot: monorepoRoot,
  async rewrites() {
    return [
      {
        source: "/:path*/static/chunks/:file*",
        destination: "/_next/static/chunks/:file*",
      },
      {
        source: "/static/chunks/:file*",
        destination: "/_next/static/chunks/:file*",
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/_next/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, OPTIONS" },
        ],
      },
    ];
  },
};

export default nextConfig;
