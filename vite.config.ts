import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const BRAND_THEME = '#0b2147'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.svg',
        'icons.svg',
        'pwa-192.png',
        'pwa-512.png',
        'animations/thinking.json',
      ],
      manifest: {
        name: 'NOVA SAFETY AI — Наряд-допуск',
        short_name: 'NOVA PTW',
        description:
          'NOVA SAFETY AI — учёт и согласование нарядов-допусков (веб-приложение).',
        lang: 'ru',
        scope: '/',
        start_url: '/',
        display: 'standalone',
        orientation: 'any',
        theme_color: BRAND_THEME,
        background_color: BRAND_THEME,
        icons: [
          {
            src: '/pwa-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2,gif,json,lottie,wasm}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/assets\//, /^\/firebase-cloud-messaging-push-scope\//],
      },
    }),
  ],
})
