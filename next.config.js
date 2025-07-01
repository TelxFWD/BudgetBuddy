/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: true,
    serverExternalPackages: [],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://0.0.0.0:5000/:path*',
      },
      {
        source: '/ws',
        destination: 'http://0.0.0.0:5000/ws',
      },
    ]
  },
}

module.exports = nextConfig