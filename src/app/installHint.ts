// Decides whether to show "add Silta to your Home Screen first". Owned by the main session.

import { Capacitor } from '@capacitor/core';

/**
 * True only for the web version opened in a normal iPhone/iPad browser tab.
 * There, Safari can delete everything a site saved after a week without visits, and the
 * Home Screen app keeps its own separate storage. So family data must be entered in the
 * Home Screen app, never in the tab. The real Android and iPhone apps are not affected.
 */
export function shouldSuggestHomeScreen(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  if (Capacitor.isNativePlatform()) return false;

  // Android phones never need this (and a desktop browser pretending to be one must not trigger it).
  if (/Android/.test(navigator.userAgent)) return false;

  const isIphoneFamily =
    /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    // iPads say they are a Mac, but a Mac has no touch screen.
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (!isIphoneFamily) return false;

  const standalone =
    (navigator as { standalone?: boolean }).standalone === true ||
    window.matchMedia?.('(display-mode: standalone)').matches === true;
  return !standalone;
}
