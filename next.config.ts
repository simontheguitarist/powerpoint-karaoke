import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Playwright is loaded dynamically inside the upload pipeline. NFT can't
  // statically discover its non-JS assets (browsers.json + the JS bundles
  // it loads at runtime), so the standalone build ships an incomplete copy.
  // Pin the whole package in.
  outputFileTracingIncludes: {
    "/api/decks/upload": [
      "./node_modules/playwright/**",
      "./node_modules/playwright-core/**",
    ],
  },
  allowedDevOrigins: ["127.0.0.1", "localhost", "10.1.1.41"],
  experimental: {
    serverActions: {
      bodySizeLimit: "120mb",
    },
  },
};

export default nextConfig;
