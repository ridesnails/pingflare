import { readFileSync } from 'node:fs'
import { sveltekit } from '@sveltejs/kit/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf-8'))

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    tailwindcss(),
    sveltekit(),
  ],
  server: {
    fs: {
      allow: ['../locales'],
    },
    proxy: {
      '/api': { target: 'http://localhost:8787', changeOrigin: true },
      '/h':   { target: 'http://localhost:8787', changeOrigin: true },
    },
  },
})
