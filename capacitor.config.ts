import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'uz.silta.app',
  appName: 'Silta',
  webDir: 'dist',
  // Colour behind the web page while it loads (the app's paper colour), so opening never flashes black.
  backgroundColor: '#F3F6F4',
  // Do NOT set server.url, server.hostname or server.iosScheme / androidScheme: saved family data is tied
  // to the app's address (capacitor://localhost, https://localhost). Changing it makes the data look gone.
  // Web inspection lets a computer on a USB cable read everything the app saved. Keep it off.
  ios: { webContentsDebuggingEnabled: false },
  android: { webContentsDebuggingEnabled: false },
};

export default config;
