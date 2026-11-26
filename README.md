# Silta

Silta helps people with early-to-moderate memory loss stay connected with their family. It shows a family album with names and kinship, and it can gently say who is in front of the camera. Everything runs on the phone: no server, no account, no internet.

One codebase (React + TypeScript) becomes three things:

- an **Android app** (Capacitor),
- an **iPhone app** (Capacitor),
- an **installable web app** (PWA) that works offline after the first open.

## Status (26 Nov 2026)

| Part | State |
| --- | --- |
| Web app | Builds. Checked in a desktop browser at phone size. |
| Android app | Debug APK builds. **Not yet run on a real phone.** |
| iPhone app | Builds. Ran in the iOS Simulator: start, saved language, home, settings, add-person form. **Not yet run on a real iPhone.** |
| Camera, face recognition, voice | **Untested on any real device.** A desktop browser and the simulator have no usable camera. |
| Checks | TypeScript, ESLint, 85 unit tests and the production build all pass. |

Please treat this as a test build for the team, not something to hand to families yet. See "Before real families use it" below.

## Product rules (please keep these)

1. **A wrong name is worse than no name.** A name is shown only when the match is close, clearly better than the second-best person, and stable over several checks. Otherwise the app says it is not sure.
2. **Nothing leaves the phone.** No network calls. The Android app has no INTERNET permission. The built app carries a Content Security Policy that blocks outside connections.
3. **Calm wording, never blame the person.** No percentages, no red error labels.
4. **Uzbek (Latin) and Russian.** All text lives in `src/i18n/uz.ts` and `src/i18n/ru.ts` with the same keys.
5. **Not a medical product.** Do not use diagnosis or treatment wording.

More detail: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md), [`docs/DESIGN.md`](docs/DESIGN.md), [`docs/UI_KIT.md`](docs/UI_KIT.md).

## Run it on your computer

You need Node.js 22 or newer.

```bash
npm install
npm run dev
```

Open the address it prints (usually http://localhost:5173) and switch the browser to a phone-size view.

## Checks

```bash
npx tsc -b        # types
npx eslint .      # lint
npx vitest run    # unit tests
npm run build     # production build into dist/
```

`npm run preview` serves the production build. Use it to test what really ships: the security policy is added to the built `index.html` only, never in dev.

## Build the Android app

You need Java 21 and the Android SDK (command-line tools are enough). Set `JAVA_HOME` and `ANDROID_HOME` for your machine, then:

```bash
npm run build && npx cap sync android
cd android && ./gradlew assembleDebug
```

The APK is written to `~/.cache/silta-android-build/app/outputs/apk/debug/app-debug.apk` (build output is kept out of the project folder on purpose). Install it with `adb install -r <apk>`.

This is a **debug** build: fine for the team's own phones only.

## Build the iPhone app

You need a Mac with Xcode.

```bash
npm run build && npx cap sync ios
npx cap open ios
```

In Xcode choose your signing team (your Apple ID), plug in the iPhone and press Run. With a free Apple ID the app stops opening after 7 days and must be installed again.

The iOS Simulator has no camera, so it can only check screens and saving.

## Where things are

```
src/screens/        one file or folder per screen
src/components/ui/  shared buttons, cards, dialogs
src/app/            navigation and shared state
src/i18n/           all text, Uzbek and Russian
src/lib/face/       face models, match rule, self-check
src/lib/camera/     camera start, stop, errors
src/lib/voice/      voice print, voice notes
src/lib/album/      family album session rules
src/lib/db/         storage on the phone (IndexedDB)
src/lib/config.ts   every tuning number in one place
public/models/      face model files shipped inside the app
android/  ios/      the native projects
```

## How the AI part works (honest wording)

Face models run with TensorFlow.js (through face-api.js) inside the phone's web view, on the device and offline. They are **not** TFLite or INT8 models; please do not describe them that way in deliverables.

After the models load, the app describes one fixed test picture and compares the result with known-good numbers. If the phone's graphics chip gives different numbers, the app switches to a slower exact mode, or refuses to name people. Settings shows a small technical line with the result (for example `face engine: webgl · check 0.0000`).

Voice recognition is weaker than face recognition and is **off by default** in Settings.

## Before real families use it

- Test on real Android and iPhone devices: camera, face recognition with 0 wrong names, voice, airplane mode.
- Make a signed release build. Debug builds can be read by a computer on a cable.
- Have a native speaker check the Uzbek and Russian text, and a lawyer check the consent wording.
- There is no caregiver PIN or app lock yet, and saved data is not encrypted by the app itself.
- If the web app is hosted for families, the host can ship new code, so "no server" is only true for the packaged apps.

## Phone test script

1. Install the app and turn on airplane mode.
2. Open it and pick a language.
3. Refuse the camera once (a kind message should appear), then allow it.
4. Add two people with 3 photos each.
5. Close the app fully and reopen: the people are still there.
6. Recognise both people 10 times each and a stranger 10 times. Target: 0 wrong names.
7. Run an Album session and tap one wrong answer on purpose.
8. Voice: 20 tries across 3 speakers.
9. Delete a person.
10. Note how many seconds a check takes, whether the phone gets hot, and the technical line in Settings.
