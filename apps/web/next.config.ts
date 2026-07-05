import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Workspace packages ship raw TypeScript; let Next compile them.
  transpilePackages: ["@noviq/env", "@noviq/sdk"],
}

export default nextConfig
