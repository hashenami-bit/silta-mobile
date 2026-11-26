// Runs by itself after every `npx cap copy` / `npx cap sync` (see "capacitor:copy:after" in package.json).
//
// Android only: older phones cannot load Capacitor's helper script the modern way, so Capacitor
// pastes it into index.html as an inline <script>. Our security policy (CSP) forbids inline
// scripts, which would silently break the back button on those phones. So the copy of index.html
// that goes INTO THE ANDROID APP gets 'unsafe-inline' for scripts. Talking to outside servers
// stays forbidden (connect-src 'self'), and the Android app has no INTERNET permission anyway.
// The web app and the iPhone app keep the strict policy.

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

if (process.env.CAPACITOR_PLATFORM_NAME === 'android') {
  const root = process.env.CAPACITOR_ROOT_DIR ?? process.cwd();
  const file = join(root, 'android', 'app', 'src', 'main', 'assets', 'public', 'index.html');
  const html = readFileSync(file, 'utf8');
  const strict = 'script-src &#39;self&#39; blob:';
  const relaxed = 'script-src &#39;self&#39; &#39;unsafe-inline&#39; blob:';
  if (html.includes(relaxed)) {
    console.log('[silta] Android security policy already allows the Capacitor helper script.');
  } else if (html.includes(strict)) {
    writeFileSync(file, html.replace(strict, relaxed));
    console.log('[silta] Android copy of index.html: allowed the Capacitor helper script.');
  } else {
    // Fail loudly: shipping an Android app whose back button may be dead is worse than a red build.
    console.error('[silta] Could not find the security policy in the Android index.html. Check vite.config.ts.');
    process.exit(1);
  }
}
