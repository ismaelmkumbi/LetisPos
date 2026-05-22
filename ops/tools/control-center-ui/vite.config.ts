import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    proxy: {
      '/api/agent/a': {
        target: 'http://10.0.0.1:9101',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/agent\/a/, ''),
      },
      '/api/agent/b': {
        target: 'http://10.0.0.2:9101',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/agent\/b/, ''),
      },
      '/api/agent/c': {
        target: 'http://10.0.0.3:9101',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/agent\/c/, ''),
      },
      '/api/agent': {
        target: 'http://10.0.0.1:9101',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/agent/, ''),
      },
      '/api': {
        target: 'http://10.0.0.1:8080',
        changeOrigin: true,
      },
      '/hub': {
        target: 'http://10.0.0.2:9101',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/hub/, ''),
      },
    },
  },
})
