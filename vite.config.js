import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5180,
    strictPort: true,
    hmr: {
      // ブラウザからサーバーへのWebSocket接続先を明示
      host: '192.168.0.86',
      port: 5180,
    },
    proxy: {
      '/predict': 'http://localhost:7860',
      '/health': 'http://localhost:7860',
      '/debug': 'http://localhost:7860',
    },
  },
})
