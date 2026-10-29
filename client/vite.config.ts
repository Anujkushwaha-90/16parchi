import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Split heavy vendor libs into separate chunks
          'vendor-react': ['react', 'react-dom'],
          'vendor-firebase': ['firebase/app', 'firebase/auth'],
          'vendor-socket': ['socket.io-client'],
          'vendor-ui': ['lucide-react', 'canvas-confetti'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
})
