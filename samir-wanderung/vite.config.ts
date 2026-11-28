import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { viteStaticCopy } from 'vite-plugin-static-copy';

const cesiumSource = 'node_modules/cesium/Build/Cesium';
const cesiumBase = 'cesium';

export default defineConfig({
  define: { CESIUM_BASE_URL: JSON.stringify(`/${cesiumBase}`) },
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        { src: `${cesiumSource}/ThirdParty`, dest: cesiumBase },
        { src: `${cesiumSource}/Workers`, dest: cesiumBase },
        { src: `${cesiumSource}/Assets`, dest: cesiumBase },
        { src: `${cesiumSource}/Widgets`, dest: cesiumBase },
      ],
    }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'SAMIR WANDERUNG',
        short_name: 'Wanderung',
        description: '3D Hiking & Journey Animation',
        theme_color: '#0b0f12',
        background_color: '#0b0f12',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        globIgnores: ['cesium/**'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
  server: { proxy: { '/api': 'http://localhost:8787' } },
  preview: { proxy: { '/api': 'http://localhost:8787' } },
  build: { chunkSizeWarningLimit: 4000 },
  test: { environment: 'jsdom', include: ['tests/**/*.test.ts'] },
} as any);
