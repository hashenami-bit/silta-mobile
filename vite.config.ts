import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Installed-app colours. A designer may change these two later.
// Keep THEME_COLOR in sync with <meta name="theme-color"> in index.html.
const BACKGROUND_COLOR = '#F3F6F4' // warm off-white splash background
const THEME_COLOR = '#0E5A63' // river teal (status bar / title bar)

// Content Security Policy: the list of places the app may load from or talk to.
// Everything is 'self' (the app's own files), so even a bad library cannot send family data out.
// blob: is needed for the voice listener and for playing saved voice notes; data: for saved photos.
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' blob:",
  "worker-src 'self' blob:",
  "connect-src 'self'",
  "img-src 'self' data: blob:",
  "media-src 'self' blob: mediastream:",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "object-src 'none'",
  "frame-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ')

/** Adds the policy to the built index.html only (the dev server needs inline scripts to work). */
function contentSecurityPolicy(): Plugin {
  return {
    name: 'silta-csp',
    apply: 'build',
    transformIndexHtml() {
      return [
        {
          tag: 'meta',
          attrs: { 'http-equiv': 'Content-Security-Policy', content: CONTENT_SECURITY_POLICY },
          injectTo: 'head-prepend',
        },
      ]
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  // node_modules may be a symlink to node_modules.nosync (iCloud helper); never watch that folder.
  server: { watch: { ignored: ['**/*.nosync/**', '**/android/**', '**/ios/**', '**/dist/**'] } },
  // The iPhone app supports iOS 15, so build for the Safari of that time.
  build: { target: ['es2020', 'safari15'] },
  plugins: [
    contentSecurityPolicy(),
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
    VitePWA({
      // We register the service worker ourselves in src/pwa.ts (skipped inside the Android app).
      injectRegister: false,
      // 'prompt' = a new version waits and is used the next time the app is fully restarted.
      // Never 'autoUpdate': that reloads the page by itself and could wipe a half-added person.
      registerType: 'prompt',
      manifest: {
        id: './',
        name: 'Silta',
        short_name: 'Silta',
        description: 'Family album and gentle name reminders, fully offline.',
        lang: 'uz',
        display: 'standalone',
        orientation: 'portrait',
        // Relative to the manifest file, so they work at a site root (and in a sub-folder).
        start_url: './',
        scope: './',
        background_color: BACKGROUND_COLOR,
        theme_color: THEME_COLOR,
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: 'icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // App shell + icons + the face model files. Model shards have no file
        // extension, so they need their own pattern.
        globPatterns: ['**/*.{js,css,html,png,svg,ico,webmanifest}', 'models/*'],
        // face_recognition_model-shard1 is exactly 4 MiB; allow up to 6 MiB per file.
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        // No runtimeCaching: the app makes no network calls.
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
})
