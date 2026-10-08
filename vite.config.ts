import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    // Tab Particle DIC gọi server Node (server/index.js, cổng 8000)
    proxy: {
      '/api': 'http://localhost:8000',
      '/ws': { target: 'ws://localhost:8000', ws: true },
    },
  },
  // OpenCV.js (WASM) rất nặng nên tăng ngưỡng cảnh báo kích thước chunk
  build: { chunkSizeWarningLimit: 12000 },
  // opencv-js là UMD/CommonJS: phải để esbuild pre-bundle, không được exclude
  optimizeDeps: { include: ['@techstark/opencv-js'] },
})
