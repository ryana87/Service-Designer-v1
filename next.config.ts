import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent webpack from bundling libsql deps (avoids README.md parse error)
  serverExternalPackages: [
    "@prisma/adapter-libsql",
    "@libsql/isomorphic-fetch",
  ],
};

export default nextConfig;
