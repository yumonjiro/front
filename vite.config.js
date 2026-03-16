import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5180,
    strictPort: true,
    allowedHosts: ['countobj.geelive-test.com'],
    hmr: {
      // ブラウザからサーバーへのWebSocket接続先を明示
      host: 'countobj.geelive-test.com',
      port: 5180,
    },
    proxy: {
      '/predict': {
        target: 'http://localhost:7860',
        timeout: 300000,
        proxyTimeout: 300000,
      },
      '/health': 'http://localhost:7860',
      '/debug': 'http://localhost:7860',
    },
  },
})
