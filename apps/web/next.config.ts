import type { NextConfig } from "next";
const config: NextConfig = {
  transpilePackages: ["@qaamuusai/schemas"],
  poweredByHeader: false,
  devIndicators: false,
};
export default config;
