import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const BRAND_THEME = '#0b2147'
const ICON_BG = '#ffffff'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.svg',
        'icons.svg',
        'apple-touch-icon.png',
        'nova-icon-192.png',
        'nova-icon-512.png',
        'nova-icon-maskable-512.png',
        'pwa-192.png',
        'pwa-512.png',
        'pwa-512-maskable.png',
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
        // iOS берёт background_color для иконки/splash — белый, не тёмный
        background_color: ICON_BG,
        icons: [
          {
            src: '/nova-icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/nova-icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/nova-icon-maskable-512.png',
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
