/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:5000/:path*',
      },
      {
        source: '/ws',
        destination: 'http://localhost:5000/ws',
      },
    ]
  },
}

module.exports = nextConfig