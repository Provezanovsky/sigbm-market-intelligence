import type { NextConfig } from "next";

const repositoryName = "sigbm-market-intelligence";
const basePath = process.env.GITHUB_ACTIONS === "true" ? `/${repositoryName}` : "";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath,
  assetPrefix: basePath,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;
