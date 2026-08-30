import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon-32.png', 'apple-touch-icon.png'],
      manifest: {
        name: "Where'd my time go?",
        short_name: 'My Time',
        description: "Take your time back — see what you've reclaimed, not just what you spent.",
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#120f14',
        theme_color: '#120f14',
        orientation: 'portrait',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          // Separate, full-bleed flat renders (not the "any" icons reused) —
          // Android applies its own mask shape on top of these, so they must
          // have no pre-rounded corners/transparency. See scripts/generate-icons.mjs.
          { src: '/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Everything the app needs is local (localStorage-based, no API calls),
        // so a simple precache of the built app shell is enough to make it
        // work offline once installed.
        globPatterns: ['**/*.{js,css,html,png,svg,woff,woff2}'],
      },
    }),
  ],
})
