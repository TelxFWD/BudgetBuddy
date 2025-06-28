/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: [
    'http://localhost:5000',
    'http://0.0.0.0:5000',
    'https://*.replit.dev',
    'https://*.replit.app',
    'http://127.0.0.1:5000'
  ],
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