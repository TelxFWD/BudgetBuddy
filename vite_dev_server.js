import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import { createProxyMiddleware } from 'http-proxy-middleware'

// Create Vite dev server
const server = await createServer({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false
      }
    }
  },
  define: {
    'process.env.NODE_ENV': '"development"'
  }
})

await server.listen()
console.log('Vite dev server running on http://0.0.0.0:3000')