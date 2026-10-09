import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  redirects() {
    return [{ source: "/trends", destination: "/health", permanent: false }];
  },
};

export default nextConfig;
