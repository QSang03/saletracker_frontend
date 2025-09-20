import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*"],
  outputFileTracingRoot: __dirname,
  /* config options here */
};

export default nextConfig;
