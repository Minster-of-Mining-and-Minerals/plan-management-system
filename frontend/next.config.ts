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
      {
        source: "/:locale/purchasing-center/:id",
        destination: "/:locale/purchasing-centers/:id",
      },
      {
        source: "/:locale/purchasing-center/:id/:path*",
        destination: "/:locale/purchasing-centers/:id/:path*",
      },
    ];
  },
};

export default withNextIntl(nextConfig);
