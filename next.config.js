/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {},
  },
  allowedDevOrigins: ['http://localhost:3000', 'https://40dd0814-2bfa-4eea-b5b9-546ee6726464-00-20fno956yqjba.worf.replit.dev'],
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