import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
export default defineConfig({
  root: resolve(import.meta.dirname, 'ui'),
  publicDir: resolve(import.meta.dirname, '../public'),
  plugins: [react()],
  build: { outDir: resolve(import.meta.dirname, '../dist-cms'), emptyOutDir: true, rollupOptions: { input: { admin: resolve(import.meta.dirname, 'ui/index.html'), preview: resolve(import.meta.dirname, 'ui/preview.html') } } },
  server: { host: '127.0.0.1', port: 5174, proxy: { '/api': 'http://127.0.0.1:8788' } },
})
