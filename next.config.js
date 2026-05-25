/** @type {import('next').NextConfig} */
const superAdminAssetOrigin =
  process.env.NEXT_PUBLIC_SUPER_ADMIN_ASSET_ORIGIN
  || process.env.SUPER_ADMIN_ASSET_ORIGIN;

const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  transpilePackages: ['bcryptjs'],
  async rewrites() {
    if (!superAdminAssetOrigin) {
      return [];
    }

    return [
      {
        source: '/assets/:path*',
        destination: `${superAdminAssetOrigin.replace(/\/$/, '')}/assets/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
