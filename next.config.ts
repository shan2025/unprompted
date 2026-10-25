import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // libSQL ships a native binding; keep it out of the server bundle.
  serverExternalPackages: ["@libsql/client", "libsql"],
  experimental: {
    serverActions: {
      // Listings can include an image of up to 8 MB.
      bodySizeLimit: "10mb",
    },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
