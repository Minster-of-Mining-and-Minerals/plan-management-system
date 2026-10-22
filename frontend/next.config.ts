import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      {
        source: "/:locale/regions/:id",
        destination: "/:locale/:id",
      },
      {
        source: "/:locale/regions/:id/:path*",
        destination: "/:locale/:id/:path*",
      },
    ];
  },
};

export default withNextIntl(nextConfig);
