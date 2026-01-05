/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  env: {
    API_GATEWAY_URL: process.env.API_GATEWAY_URL || 'http://localhost:3000',
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.API_GATEWAY_URL || 'http://localhost:3000'}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;