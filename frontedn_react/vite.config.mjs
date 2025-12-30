import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'build',
    emptyOutDir: true
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'es2020'
    },
    include: ['react', 'react-dom', 'react-router-dom']
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  }
})

