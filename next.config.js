/** @type {import('next').NextConfig} */

if (typeof self === "undefined") {
  global.self = global
}

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? ""

const nextConfig = {
  output: "export",
  basePath: basePath || undefined,
  assetPrefix: basePath ? `${basePath}/` : undefined,
  reactStrictMode: true,
  transpilePackages: ["@vechain/vebetterdao-contracts"],
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    turbo: {
      resolveAlias: {
        fs: { browser: "./src/lib/empty-module.ts" },
        net: { browser: "./src/lib/empty-module.ts" },
        tls: { browser: "./src/lib/empty-module.ts" },
      },
    },
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      }
    }
    return config
  },
}

module.exports = nextConfig
