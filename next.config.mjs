/** @type {import('next').NextConfig} */
import { createRequire } from "module";

// Check if element-tagger is available
function isElementTaggerAvailable() {
  try {
    const require = createRequire(import.meta.url);
    require.resolve("@softgenai/element-tagger");
    return true;
  } catch {
    return false;
  }
}

// Build turbo rules only if tagger is available
function getTurboRules() {
  if (!isElementTaggerAvailable()) {
    console.log(
      "[Softgen] Element tagger not found, skipping loader configuration"
    );
    return {};
  }

  return {
    "*.tsx": ["@softgenai/element-tagger"],
    "*.jsx": ["@softgenai/element-tagger"],
  };
}

const nextConfig = {
  reactStrictMode: true,
  experimental: {
    turbo: {
      rules: getTurboRules(),
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  allowedDevOrigins: ["*.daytona.work", "*.softgen.dev"],
  // eyb-network.vercel.app is the original Vercel domain, kept live so old
  // links/bookmarks still work — but network.eymeder.com is now the
  // canonical address, so anyone hitting the old one is sent there.
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "eyb-network.vercel.app" }],
        destination: "https://network.eymeder.com/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
