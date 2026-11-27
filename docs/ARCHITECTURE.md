# Silta app architecture (mobile build)

Silta is an offline, on-device family-connection app for people with early-to-moderate memory loss and their caregivers. One React + TypeScript codebase ships as an Android app (Capacitor) and as an installable offline web app (PWA).

## Product rules (never break these)

1. **Offline only.** No network calls at runtime. No analytics, no CDN, no Web Speech API.
2. **A wrong name is worse than no name.** Show a name only on a confident match. Otherwise use the gentle fallback text.
3. **Gentle and errorless.** No error tones, no red "wrong" marks, no percentages, no confidence numbers, no jargon ("descriptor", "embedding", "Face ID", "model").
4. **Non-medical.** No "patient", "assessment", "treats", "improves memory".
5. **Nothing starts by itself.** Camera and microphone start only from a visible button and always show that they are on.
6. **Two languages.** Every visible string comes from `src/i18n` (`uz` Latin and `ru`). No hard-coded text in screens.
7. **Elder-friendly UI.** Large text (body ≥ 18px), big touch targets (≥ 56px), every icon has a text label, high contrast, calm motion.
8. **Caregiver-only notes stay with the caregiver.** Anything the elder sees or hears about a person goes through `elderNotes()` / `elderVoiceNotes()` in `src/lib/notes`. Never read `person.memoryNotes` directly in an elder screen.

9. **Caregiver screens sit behind the PIN.** People, person pages, add/edit person, Settings and PIN setup are listed in `isCaregiverRoute()` (`src/app/navigation.ts`). A new screen that shows or changes caregiver data must be added there. The lock is a gentle barrier for the elder, not protection against someone with tools: never describe it as encryption or as making data safe from theft.

## Layers

```
src/screens/*            one folder or file per screen; no direct IndexedDB / face-api / Meyda imports
src/components/ui/*      shared buttons, cards, dialog, bottom bar, toast host
src/app/*                navigation + shared state (AppProvider, useApp)
src/i18n/*               uz.ts (key list), ru.ts (same keys), index.ts (translate helpers)
src/lib/types.ts         all shared data types
src/lib/config.ts        every tuning number in one place
src/lib/db/*             IndexedDB storage (people, settings, session log, voice notes); migrate.ts upgrades old records on read
src/lib/face/*           model loading, face description, strict match rule
src/lib/camera/*         camera start/stop/switch with error states
src/lib/voice/*          offline voice print, strict match rule, voice-note recorder
src/lib/album/*          Family Album session rules (pure logic)
src/lib/lock/*           caregiver PIN: scrambling, checking, wait after wrong tries (pure logic)
src/lib/notes/*          notes about a person: who may see a note, which one to show, limits (pure logic)
public/models/*          AI model files shipped inside the app
android/*                Capacitor Android project
```

Dependencies point downward only: screens → app/ui/i18n → lib. `lib/*` never imports from `screens`, `components` or `app`.

## Contracts

The files below are the agreed interfaces. They are owned by the main session. If you need a change, report it; do not edit them.

- `src/lib/types.ts`, `src/lib/config.ts`
- `src/lib/db/api.ts`, `src/lib/face/api.ts`, `src/lib/camera/api.ts`, `src/lib/voice/api.ts`
- `src/i18n/index.ts`
- `src/app/navigation.ts`, `src/app/appContext.ts`, `src/app/AppProvider.tsx`

Each `lib/<name>/index.ts` must export exactly what its `api.ts` describes.

## Working rules while several agents share this folder

- Nothing is committed to git. Do not run `git add`, `git commit`, `git stash`, `git checkout` or `git restore`.
- Edit only the files your task says you own. Read anything.
- Do not run `npm install`, `npm run build` or Gradle. Ask the main session.
- You may check your own files with `npx eslint <your files>`, `npx tsc --noEmit -p tsconfig.app.json` (ignore errors in files you do not own) and `npx vitest run <your folder>`.
- The old prototype (`src/App.tsx`, `src/components/*.tsx`, `src/hooks`, `src/utils`, `src/types.ts`) stays untouched until the final swap. Do not import from it in new code.

## Code conventions

- TypeScript strict. `erasableSyntaxOnly` is on: no `enum`, no constructor parameter properties, no `namespace`. Use union types and plain objects.
- `verbatimModuleSyntax` is on: use `import type` for types.
- The React Compiler and `eslint-plugin-react-hooks` v7 are active: no manual `useMemo`/`useCallback` unless needed, no reading refs during render, no `setState` directly in an effect body without a reason.
- A file exports either components or non-components, not both (react-refresh lint rule).
- Ids are `crypto.randomUUID()`. Times are `Date.now()` milliseconds.
- No `window.alert` / `window.confirm`. Use the dialog in `src/components/ui`.
