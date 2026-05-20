import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["127.0.0.1", "localhost", "10.1.1.41"],
  experimental: {
    serverActions: {
      bodySizeLimit: "120mb",
    },
  },
};

export default nextConfig;
