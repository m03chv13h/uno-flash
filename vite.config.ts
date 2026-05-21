import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Serves from /uno-flash/ so the app works at m03chv13h.github.io/uno-flash/
  // without a redirect. To also serve from the subdomain uno-flash.blunzinger.com,
  // set up a DNS-level redirect (or a separate Cloudflare/Netlify deployment with
  // base: '/') rather than using GitHub Pages' built-in custom-domain feature,
  // because that feature forces a redirect away from the github.io URL.
  base: '/uno-flash/',
})
