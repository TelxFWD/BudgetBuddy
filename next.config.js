/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    allowedDevOrigins: ['https://317fe22f-0282-420b-a01d-2a82b255ecb7-00-z2cs1mhi0k3z.sisko.replit.dev'],
  },
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