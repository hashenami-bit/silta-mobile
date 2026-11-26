import { Capacitor } from '@capacitor/core'
import { registerSW } from 'virtual:pwa-register'

/**
 * Registers the offline service worker, but only in a normal browser build.
 * Skipped inside the Android and iPhone apps (Capacitor already ships the files) and in dev.
 */
export function registerPwa(): void {
  if (import.meta.env.DEV) return
  if (Capacitor.isNativePlatform()) return
  // A new version waits quietly and takes over at the next full restart of the app.
  // It never reloads the page by itself, so a half-finished "add person" is never lost.
  registerSW({ immediate: true })
}
