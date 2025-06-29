/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: [
    'http://localhost:5000',
    'http://0.0.0.0:5000',
    'http://127.0.0.1:5000',
    'https://3c4dda74-4bad-46e4-9ce7-c7b5effbd433-00-1g0mxegu8mtmx.spock.replit.dev',
    'https://*.replit.dev',
    'https://*.replit.app'
  ],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://0.0.0.0:8000/:path*', // Proxy to FastAPI backend
      },
    ]
  },
  serverExternalPackages: [],
}

module.exports = nextConfig