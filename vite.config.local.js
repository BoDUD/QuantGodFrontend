import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const backendApiBaseUrl = process.env.QG_BACKEND_API_BASE_URL || 'http://127.0.0.1:8080'

export default defineConfig({
  base: '/vue/',
  plugins: [vue()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: backendApiBaseUrl,
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
