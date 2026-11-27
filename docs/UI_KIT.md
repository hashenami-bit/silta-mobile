# UI kit quick reference

Import everything from `src/components/ui` (relative path from your file). Read the component source for exact props; each `*Props` interface is exported.

| Component | Props (short) | Notes |
|---|---|---|
| `Screen` | `tone?: 'paper'\|'night'`, `withBottomBar?` + div props | Page root. Use on every screen. |
| `PrimaryButton`, `SecondaryButton`, `TextButton` | `icon?` + button props | One PrimaryButton per screen. |
| `DangerButton` | `icon?`, `quiet?` + button props | Delete actions only. |
| `Card` | div props, or `as="button"` + button props | Button variant is the list row; add `aria-label`. |
| `ScreenHeader` | `title`, `onBack?`, `right?` | Tab screens: no `onBack`. |
| `BottomBar` | none | Only on Home, People, Settings (and optionally Help). |
| `ConfirmDialog` | `open`, `title`, `body`, `confirmLabel`, `cancelLabel?`, `danger?`, `onConfirm`, `onCancel` | Never use window.confirm. |
| `ToastHost` | none | Rendered once by the app shell. Screens call `useApp().notify(text, kind)`. |
| `Field`, `TextAreaField` | `label`, `hint?`, `optional?`, `value`, `onChange(string)` + input/textarea props | |
| `Checkbox` | `label`, `checked`, `onChange(boolean)` | |
| `Switch` | `label`, `hint?`, `checked`, `onChange(boolean)` | |
| `ChoiceTile` | `selected?`, `onSelect`, `ariaLabel?`, `tone?: 'default'\|'praise'`, `disabled?` | |
| `PersonAvatar` | `person?` or `name?` + `src?`, `size: 'list'\|'detail'\|'card'` | |
| `Panel` | `tone: 'lantern'\|'river'`, `title?`, `role?` | Soft info panel. Never red. |
| `PinPad` | `value`, `onChange`, `length`, `disabled?` | Dots (digits are never shown) and a 3×4 grid of `min-h-tap-lg` keys; erase key has icon + label `lock.erase`. |
| `MatchCard` | `person`, `actions?` | Photo, big name, introduce sentence, who-line, one changing memory (only "show to elder" ones), listen button for a family voice message. |
| `UnsureCard` | `sentence?`, `actions?` | Default sentence is `recognize.unsure`. |
| `EmptyState` | `icon`, `title`, `body`, `action?`, `role?` | Pass a plain lucide `<Icon />`. |
| `DeviceProblem` | `kind: 'camera'\|'mic'`, `error: DeviceError`, `onRetry`, `onBack` | Camera/mic refused or broken. |
| `OvalGuide` | `caption?` | Not positioned: wrap it yourself. |
| `DeviceOnPill` | `kind: 'camera'\|'mic'` | Show whenever camera or mic is on. Position it yourself. |
| `LevelMeter` | `level` 0..1 | |
| `StepBar` | `current` (from 1), `total` | Wizard progress. |
| `LoadingScreen` | `failed?`, `onRetry?` | |

Screen conventions:
- One file exports one named screen component. Screens read shared state with `useApp()` from `src/app/appContext` (`t`, `lang`, `people`, `settings`, `navigate`, `replace`, `back`, `goHome`, `savePerson`, `deletePerson`, `updateSettings`, `clearAllData`, `logSession`, `notify`, `db`).
- All visible text through `t('key')`. Sentences about a person through `introduce(lang, name, kinship)` and `kinshipLabel(lang, kinship)` from `src/i18n`.
- Session history: call `logSession({...})` once when a face, voice or album session ends, with `startedBy: settings.defaultStarter`.
- Camera and microphone start only from a button press, show `DeviceOnPill` while on, and stop when the screen closes.
