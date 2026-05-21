import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Custom domain: serve from root; GitHub Pages will redirect the old
  // m03chv13h.github.io/uno-flash/ URL to uno-flash.blunzinger.com automatically.
  base: '/',
})
