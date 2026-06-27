import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  output: "standalone",
  async rewrites() {
    const apiUrl = process.env.INTERNAL_API_URL ?? "http://127.0.0.1:8000";

    return [
      {
        source: "/health",
        destination: `${apiUrl}/health`,
      },
      {
        source: "/site/:path*",
        destination: `${apiUrl}/site/:path*`,
      },
      {
        source: "/project/model-test/:path*",
        destination: `${apiUrl}/project/model-test/:path*`,
      },
    ];
  },
};

export default nextConfig;
