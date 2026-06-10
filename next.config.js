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
        // Route legacy /assets/tenants/{slug}/{file} URLs (from old branding
        // configs) to the admin app's dynamic asset route. The leading
        // "tenants" segment is part of the legacy path scheme — the admin
        // app's /api/tenant-assets/[slug]/[file] expects {slug} directly.
        source: '/assets/tenants/:path*',
        destination: `${superAdminAssetOrigin.replace(/\/$/, '')}/api/tenant-assets/:path*`,
      },
      {
        source: '/api/tenant-assets/:path*',
        destination: `${superAdminAssetOrigin.replace(/\/$/, '')}/api/tenant-assets/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
