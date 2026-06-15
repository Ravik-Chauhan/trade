/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

declare const process: { env: Record<string, string | undefined> }

// Set SINGLEFILE=1 to inline all JS/CSS into one portable index.html
const singlefile = process.env.SINGLEFILE === '1'

export default defineConfig({
  base: singlefile ? './' : '/',
  plugins: [react(), ...(singlefile ? [viteSingleFile()] : [])],
  server: {
    host: true,
    port: 5173,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/game/**'],
    },
  },
})
