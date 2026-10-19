import { defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';
import { execSync } from 'node:child_process';

const version = (() => {
  try { return execSync('git rev-parse --short HEAD').toString().trim(); } catch { return 'dev'; }
})();

// BASE_PATH is set by the GitHub Pages workflow (e.g. "/xrpblocky/").
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  define: { __APP_VERSION__: JSON.stringify(version) },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'XRP Blocky',
        short_name: 'XRP Blocky',
        description: 'Blokkos programozás az XRP robothoz',
        lang: 'hu',
        display: 'standalone',
        orientation: 'any',
        background_color: '#E9EEF5',
        theme_color: '#2F5BEA',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }]
      },
      workbox: { globPatterns: ['**/*.{js,css,html,svg,woff2}'], maximumFileSizeToCacheInBytes: 4 * 1024 * 1024 }
    })
  ],
  build: { chunkSizeWarningLimit: 1200 },
  test: { environment: 'node' }
});
