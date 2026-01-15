import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Docker-specific Vite configuration
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Listen on all network interfaces
    port: 5173,
    watch: {
      usePolling: true, // Required for Docker on some systems
    },
    strictPort: true,
  }
})
