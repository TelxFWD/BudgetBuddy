/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://0.0.0.0:8000/:path*', // Proxy to FastAPI backend
      },
    ]
  },
}

module.exports = nextConfig