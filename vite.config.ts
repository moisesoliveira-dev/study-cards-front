/// <reference types="vitest" />

import legacy from '@vitejs/plugin-legacy'
import react from '@vitejs/plugin-react'
import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'

/** Copia o worker do pdf.js para /public (URL estável, sem hash do Vite). */
function copyPdfWorker(): Plugin {
  const copy = () => {
    const src = resolve('node_modules/pdfjs-dist/build/pdf.worker.min.mjs')
    const dest = resolve('public/pdf.worker.min.mjs')
    if (!existsSync(src)) {
      console.warn('[copy-pdf-worker] pdf.worker.min.mjs não encontrado em node_modules')
      return
    }
    mkdirSync(dirname(dest), { recursive: true })
    copyFileSync(src, dest)
  }

  return {
    name: 'copy-pdf-worker',
    buildStart: copy,
    configureServer: copy,
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    legacy(),
    copyPdfWorker(),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
  }
})
