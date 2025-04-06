import type { NextConfig } from "next";

module.exports = {
  env: {
    ASSEMBLYAI_API_KEY: process.env.ASSEMBLYAI_API_KEY,
  },
};
const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
