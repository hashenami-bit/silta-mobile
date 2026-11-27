# Silta design spec

Look: calm river teal on pale mist, warm lantern-yellow for praise. Names and big sentences use a serif (`font-display`); everything else is system sans. No web fonts, no remote images.

## 1. Rules for every screen
- Body text 18px (`text-body`). Never smaller than `text-caption` (16px), and only for hints.
- Touch targets at least 56px (`min-h-tap min-w-tap`). Big tiles 72px (`min-h-tap-lg`). Keep 12px (`gap-3`) between targets.
- Every icon sits next to a visible text label. Icon-only buttons are not allowed, except camera "switch" and "close", which also get text under the icon.
- Focus: global `:focus-visible` ring is in `index.css`. Never write `outline-none` without a ring replacement.
- `aria-label`: needed when the visible text is not enough ("Open page: Dilnoza" = `people.open`). Decorative icons: `aria-hidden="true"`.
- Page title is the only `h1` per screen. Dialogs use `role="dialog" aria-modal="true" aria-labelledby`.
- Toasts: `role="status" aria-live="polite"`. Camera/mic problems: `role="alert"`.
- Colour is never the only signal. Selected = tint + thick border + check icon.
- Never red for "wrong". `brick` is only for delete actions.
- Never show numbers for score, mistakes or confidence. Progress "2 / 6" is allowed in the album.
- Motion: only `animate-rise-in` (card appears) and `animate-fade-in`. Reduced motion is handled in CSS.
- Safe areas: screen root `className="screen"`; bottom bar and sticky footers add `pb-safe`.
- Page padding: `px-5` (20px). Section gap: `space-y-6`. Max width on big screens: `mx-auto w-full max-w-md`.

## 2. Tokens (tailwind.config.js)
| Token | Hex | Use |
|---|---|---|
| `paper` | #F3F6F4 | app background |
| `surface` | #FFFFFF | cards, inputs, dialogs |
| `sunken` | #E6EDEA | secondary button, quiet wells |
| `edge` | #5E767A | input and tile borders |
| `hairline` | #C9D6D1 | soft dividers only |
| `ink` / `ink-soft` | #14262B / #3F5559 | body text / hints |
| `river` (`dark`, `tint`) | #0E5A63 / #0A444B / #DCEEEE | primary action, links, selected |
| `lantern` (`tint`, `ink`) | #F2B544 / #FFF1D6 / #6B4200 | praise, caregiver note, highlights |
| `brick` (`dark`, `tint`) | #8A2D3B / #6F2230 / #F8E6E8 | delete only |
| `night` | #0B1517 | camera screens only |

Type: `text-caption` 16, `text-body` 18, `text-lead` 22 (buttons, list names), `text-title` 28 (screen titles, `font-display`), `text-display` 36, `text-hero` 44 (name on match card, `font-display`).
Radii: `rounded-btn` 16, `rounded-tile` 20, `rounded-card` 24, `rounded-sheet` 32 (dialog top corners).
Shadows: `shadow-lift` (cards), `shadow-bar` (bottom bar).
Contrast: ink on paper 15:1, ink-soft 7:1, white on river 8:1, white on brick 8:1 (all AAA).

## 3. Component recipes
Use `cn`-style joining. Add `disabled:opacity-50 disabled:cursor-not-allowed` to all buttons.

**PrimaryButton** (one per screen)
`inline-flex w-full min-h-tap items-center justify-center gap-3 rounded-btn bg-river px-6 py-3 text-lead font-semibold text-white shadow-lift active:bg-river-dark`

**SecondaryButton**
`inline-flex w-full min-h-tap items-center justify-center gap-3 rounded-btn border-2 border-river bg-surface px-6 py-3 text-lead font-semibold text-river active:bg-river-tint`

**DangerButton**
`inline-flex w-full min-h-tap items-center justify-center gap-3 rounded-btn bg-brick px-6 py-3 text-lead font-semibold text-white active:bg-brick-dark`
(Quiet variant for "Delete person" on a page: SecondaryButton with `border-brick text-brick`.)

**Card**
`rounded-card bg-surface p-5 shadow-lift`  (list row card: add `flex items-center gap-4 min-h-tap-lg`)

**ScreenHeader** (title + labelled back button)
```
<header class="pt-safe px-5 pb-3">
  <button class="-ml-2 inline-flex min-h-tap items-center gap-2 rounded-btn px-2 text-lead font-semibold text-river">
    <ArrowLeft aria-hidden /> {t('common.back')}
  </button>
  <h1 class="mt-1 font-display text-title text-ink">{title}</h1>
</header>
```
Tab screens (Home, People, Settings) have no back button, only the title.

**BottomBar** (3 tabs: nav.home, nav.people, nav.settings; `nav` element, `aria-label=nav.label`)
Bar: `fixed inset-x-0 bottom-0 z-20 flex border-t border-hairline bg-surface pb-safe shadow-bar`
Tab: `flex min-h-bar flex-1 flex-col items-center justify-center gap-1 text-caption font-semibold text-ink-soft`
Active tab: `text-river bg-river-tint` + `aria-current="page"`. Icon 28px (Home, Users, Settings). Screens above it need `pb-28`.

**Dialog** (confirm: two buttons, cancel first in DOM, confirm second)
Backdrop: `fixed inset-0 z-40 flex items-end justify-center bg-ink/50 animate-fade-in sm:items-center`
Sheet: `w-full max-w-md rounded-t-sheet bg-surface p-6 pb-safe sm:rounded-sheet` with `font-display text-title` title, `text-body text-ink-soft` body, then `mt-6 space-y-3` buttons. Cancel = SecondaryButton (`common.cancel`), confirm = PrimaryButton or DangerButton. Escape and backdrop tap = cancel. Focus goes to Cancel on open. Strong confirm (clear all data): DangerButton text `settings.clear.confirm`.

**Toast** (above bottom bar, 3 seconds)
`fixed inset-x-5 bottom-28 z-50 mx-auto max-w-md rounded-btn bg-ink px-5 py-4 text-body font-semibold text-white shadow-lift animate-rise-in` with a Check icon. Keys: `toast.*`.

**Field** (label + input)
```
<label class="block text-body font-semibold text-ink">{label}
  <input class="mt-2 min-h-tap w-full rounded-btn border-2 border-edge bg-surface px-4 text-body text-ink placeholder:text-ink-soft focus-visible:border-river" />
</label>
<p class="mt-1 text-caption text-ink-soft">{hint}</p>
```
Optional fields: add `common.optional` in `text-ink-soft font-normal` after the label.

**Switch** (row: label left, switch right, hint below; whole row is the button, `role="switch" aria-checked`)
Row: `flex min-h-tap-lg w-full items-center justify-between gap-4 rounded-tile bg-surface p-4 text-left`
Track: `h-9 w-16 shrink-0 rounded-full p-1 transition-colors` on = `bg-river`, off = `bg-edge`. Thumb: `h-7 w-7 rounded-full bg-white transition-transform` on = `translate-x-7`. Also print `common.on` / `common.off` text next to it.

**ChoiceTile** (large selectable tile: language, kinship, starter, album answers)
`flex min-h-tap-lg w-full items-center justify-center gap-3 rounded-tile border-2 border-edge bg-surface px-4 py-3 text-lead font-semibold text-ink`
Selected: `border-river bg-river-tint text-river` + Check icon, `aria-pressed="true"` (or `role="radio"` inside `role="radiogroup"`). Kinship picker: 2-column grid `grid grid-cols-2 gap-3`.

**PersonAvatar** (photo or initial)
Sizes: list `h-16 w-16`, detail `h-24 w-24`, card `h-56 w-56` (match/album: `aspect-square w-full max-w-xs`). Image: `rounded-full object-cover` (cards: `rounded-card`). `alt` = `common.photoOf`. No photo: `bg-river-tint text-river font-display` with the first letter.

**MatchCard** (face and voice share it; `animate-rise-in`, `aria-live="polite"`)
`mx-auto w-full max-w-md rounded-card bg-surface p-5 text-center shadow-lift`
- Photo: PersonAvatar card size, centered, `ring-4 ring-lantern`.
- Name: `mt-4 font-display text-hero text-ink`.
- Sentence: `introduce()` in `mt-1 text-lead text-ink-soft` (the name appears only once: if the sentence is shown, keep the big name too, it helps reading).
- Who-line (only if set): `mt-3 text-lead text-ink` under the introduce sentence.
- Memory (only if one is marked "show to elder"; a different one each time): `mt-4 rounded-tile bg-lantern-tint p-4 text-left text-body text-lantern-ink` with small label `match.noteTitle` in `font-semibold`.
- Unsure variant: no photo, `font-display text-title` showing `recognize.unsure`, then two buttons: Primary `recognize.tryAgain`, Secondary `recognize.openAlbum`.

**EmptyState**
`mx-auto flex max-w-sm flex-col items-center gap-4 px-5 py-12 text-center`: 56px icon in `text-river`, `font-display text-title` title, `text-body text-ink-soft` body, then one PrimaryButton.

## 4. Screens (top to bottom)
Loading app: `night`-free; centered `app.name` in `font-display text-display text-river`, `app.tagline`, `app.loading` below. Failed: `app.loadFailed` + PrimaryButton `common.tryAgain`.

### 4.1 First start (no bottom bar)
`start.title` (show BOTH languages: `translate('uz','start.title')` and `translate('ru','start.title')`, one under the other), two ChoiceTiles `start.uz`, `start.ru` (`text-title`, tall), small `start.subtitle` in the language just tapped. Tapping a tile saves and goes Home. Not selectable by default.

### 4.2 Home (tab)
`home.title` (title) + `home.subtitle`. Then 2 or 3 big action cards, each full width, `min-h-[7.5rem]`, icon 40px left, label `font-display text-title`, hint `text-body text-ink-soft`: Album (`home.album`, `home.albumHint`, river fill style: `bg-river text-white`, hint `text-white/90`), Who is this? (`home.recognize`, `home.recognizeHint`, surface card with river icon), Voice (`home.voice`, `home.voiceHint`, only if `voiceEnabled`). Below: `home.helpLink` as a text button (`min-h-tap text-river underline`). Bottom bar. If no people: a `bg-lantern-tint` panel (`home.setup.title`, `home.setup.body`, PrimaryButton `home.setup.action`) above the cards; the cards stay visible.

### 4.3 Who is this? (camera, no bottom bar, `bg-night`)
- Intro (before camera starts): ScreenHeader `recognize.title`, `recognize.intro`, PrimaryButton `recognize.start`. Nothing starts by itself.
- Starting: `recognize.starting`, centered on night, white text.
- Looking: video fills screen. Soft oval guide centered (`w-64 h-80 rounded-[50%] border-4 border-white/70`, no animation, no moving box). Under it `recognize.guide`; a pill at top-left `camera.on` with a lantern dot. Status line `recognize.looking`. Top-right: close (X + `recognize.close` text) and switch camera (`recognize.switch`). Both `min-h-tap`, `bg-night/70 text-white rounded-btn`.
- Match: MatchCard slides up from the bottom over the dimmed video; buttons Primary `recognize.again`, Secondary `common.close`.
- Unsure: MatchCard unsure variant.
- No people: EmptyState (`recognize.noPeople.*`), on paper background, with back button.
- Camera problem: EmptyState on paper with `role="alert"`. denied: `camera.denied.title/body`; other errors: `camera.problem.title` + `camera.<notFound|inUse|unsupported|unknown>.body`. Buttons: Primary `common.tryAgain`, Secondary `common.back`.

### 4.4 Family Album (no bottom bar)
- Intro: ScreenHeader `album.title`, `album.intro`, PrimaryButton `album.start`. Empty (<2 people): EmptyState `album.empty.*`.
- Top row on every card: back button, `album.progress` right-aligned (`text-ink-soft`).
- Study card: big photo (card size), name `font-display text-hero`, sentence `introduce()`, PrimaryButton `album.next`. Browse-only: study cards only, last button `common.done`.
- Prompt: photo, `album.prompt` (title), two ChoiceTiles with names (`album.choiceLabel` as aria-label). Tiles show only the name. Correct tap: tile turns `bg-lantern-tint border-lantern`, praise panel with one of `album.praise.1-3`, then PrimaryButton `album.continue`. Wrong tap: no red, no shake, no "wrong". Show the right answer as a `bg-lantern-tint` panel with `introduce()` in `font-display text-title`, then PrimaryButton `album.continue`. Both tiles disabled after the tap.
- End: big check/heart icon in `text-river`, `album.end.title` (`text-display`), `album.end.body`, Primary `album.end.again`, Secondary `album.end.home`. Always the same, no counts.

### 4.5 People (tab)
`people.title`, list of Card rows (PersonAvatar list size, name `text-lead font-semibold`, kinship label `text-body text-ink-soft`, chevron). Each row is a button with `aria-label=people.open`. Sticky PrimaryButton `people.add` above the bottom bar (`bottom-bar` offset + `pb-safe`). Empty: EmptyState `people.empty.*` with action `people.add`.

### 4.6 Person detail
ScreenHeader (back, name as title). Photo strip (horizontal scroll, `h-32 w-32 rounded-tile`, main photo first), `introduce()`-style kinship line, who-line under it, Card `person.about` with birthday / phone / city (only the ones filled in). Section `memory.title` (MemoryNotesPanel): `memory.intro`, counter `memory.count`, one row per written memory with its text, Switch `memory.show.label` and quiet danger `memory.delete`; add box on `bg-river-tint` with TextArea `memory.new.label`, Switch `memory.show.label` (+ `memory.show.hint`; off at first, so a new note stays with the caregiver) and Primary `memory.add`; at 10 notes the add box becomes a `memory.full` panel. Section `voiceNotes.title` (`voiceNotes.limit` under it; each row also has the Switch `voiceNotes.share.label`, off for a new recording): rows with Play button (`voiceNotes.play`, toggles to `voiceNotes.stop`) + `voiceNotes.item` + delete (`voiceNotes.delete`); empty `voiceNotes.empty`; Secondary button `voiceNotes.record` (while recording: Primary-style `voiceNotes.stop`, `voiceNotes.recording`, level meter, `mic.on`). Mic problems: inline `bg-lantern-tint` panel using `mic.*`. Bottom: Secondary `person.edit`, quiet danger `person.delete`. Delete opens Dialog `person.delete.title/body/confirm`; after: toast `toast.deleted`, go to People.

### 4.7 Add / edit person wizard (no bottom bar)
Header: back, `add.title.new|edit`, under it `add.step` and a 5-segment bar (`h-2 rounded-full bg-river` done, `bg-hairline` rest). Sticky footer: PrimaryButton (Continue/Save) + back. Leaving with data: Dialog `add.leave.*`. Edit mode skips step 1.
1. Consent: `add.consent.title`, `add.consent.intro`, Field `add.consent.caregiver` (+hint), two checkbox rows (24px box inside a `min-h-tap` row, `add.consent.check.caregiver`, `add.consent.check.person`), `privacy.short` in a `bg-river-tint` panel. If not complete and user taps Continue: show `add.consent.needAll` in `text-lantern-ink` panel (not red). Continue is disabled until complete.
2. Details: `add.details.title`, Field `add.name.label` (placeholder `add.name.placeholder`), `add.kinship.label` + ChoiceTile grid of 17 presets (`kin.*.label`) + last tile `add.kinship.other`; when chosen show Field `add.kinship.otherLabel` (placeholder `add.kinship.otherPlaceholder`). Field `add.whoLine.label` (max 80 characters, `add.whoLine.hint`, counter `add.whoLine.count`, optional). Live preview Card: `add.preview` label + `introduce()` + who-line. Then `add.more.title` / `add.more.hint` with optional Fields `add.birthday.label` (date), `add.phone.label` (tel), `add.city.label`.
3. Photos: `add.photos.title`, `add.photos.intro`, PrimaryButton `add.photos.start`. Camera: oval guide as in 4.3, `camera.on` pill, current guidance line (`add.shot.straight`, `.left`, `.right`, `.glasses`, `.light`, in that order for shots 1-5), shutter PrimaryButton `add.photos.take`, count `add.photos.count`. Thumbnails row (`h-20 w-20 rounded-tile`) each with `add.photos.remove`. `add.photos.checking` while testing. No face: `bg-lantern-tint` panel `add.photos.noFace.title/body` + `common.tryAgain`. Continue enabled at 3 photos; under 3 show `add.photos.need`. Camera problem: same as 4.3.
4. Voice (optional): `add.voice.title`, `add.voice.intro` ({name}), `add.voice.sample`, PrimaryButton `add.voice.record`; recording: `add.voice.listening`, `mic.on`, level meter (`role="meter" aria-label=mic.level`, bar `h-4 rounded-full bg-sunken`, fill `bg-river` width by level), button `add.voice.stop`. Done: `add.voice.recorded` check, then next sample. Nothing heard: panel `add.voice.noSpeech`. Always visible Secondary `add.voice.skip`. Mic problems: `mic.*`.
5. Saved: check icon, `add.saved.title`, `add.saved.body`, Primary `add.saved.finish`, Secondary `add.saved.another`. Toast `toast.saved`. Save failure: panel `error.saveFailed` + `common.tryAgain`.

### 4.8 Voice (no bottom bar, normal paper background)
ScreenHeader `voice.title`; `voice.intro`; one big round button (`h-40 w-40 rounded-full bg-river text-white text-lead`, icon + `voice.press`). Listening: button becomes `voice.stop`, `animate-breathe` ring, `mic.on`, `voice.listening`, level meter. Result: MatchCard (voice variant, no photo requirement) or unsure panel `voice.unsure` with `common.tryAgain`. `voice.noSpeech` in `bg-lantern-tint` panel. Always `voice.helper` in `text-caption text-ink-soft` at the bottom. No voices: EmptyState `voice.noVoices.*`. Mic refused: EmptyState `mic.denied.*`, buttons `common.tryAgain`, `common.back`.

### 4.9 Settings (tab)
`settings.title`; Card sections in this order: Language (`settings.language`, two ChoiceTiles `start.uz`/`start.ru`); Switch `settings.browseOnly` + `settings.browseOnlyHint`; Switch `settings.voice` + `settings.voiceHint`; `settings.starter` + hint + three ChoiceTiles (`settings.starter.*`); `settings.history.title` Card with three lines (`settings.history.album|face|voice`, `{count}`) or `settings.history.empty`; Secondary `settings.help`; `settings.privacy.title` + `privacy.short` + `settings.privacy.body`; quiet danger button `settings.clear` -> Dialog `settings.clear.*` (DangerButton `settings.clear.confirm`), toast `toast.cleared`; footer `settings.version` `{version}` in `text-caption text-ink-soft`. Bottom bar.

### 4.10 Help
ScreenHeader `help.title`. Six Cards, each `help.qN` as `font-display text-lead` and `help.aN` as body (always open, no accordion, easier for readers). Order 1-6. Bottom bar optional.

### 4.11 Shared states
- Confirm dialog: see Dialog. Toast: see Toast (`toast.saved`, `toast.deleted`, `toast.cleared`, `toast.noteSaved`, `toast.memorySaved`).
- Any unexpected failure: EmptyState with `error.title`, `error.generic`, PrimaryButton `common.tryAgain`.

## 5. i18n placeholders
`{phrase}` `{name}` (person.introduce), `{current}` `{total}` (album.progress, add.step, add.voice.sample), `{count}` `{max}` (add.photos.*, settings.history.*), `{seconds}` (voiceNotes.item), `{version}` (settings.version), `{name}` in add.voice.intro, add.saved.body, person.delete.body, common.photoOf, album.choiceLabel, people.open.

## Caregiver PIN (added 2026-11-27)

- Unlock (`src/screens/Unlock.tsx`): shown in place of any caregiver screen while a PIN is set and the area is closed. ScreenHeader `lock.title` (back = home), `lock.body`, PinPad, one calm lantern Panel for `lock.wrong` / `lock.wait` / `error.generic`, TextButton `lock.forgot` that opens a river Panel `lock.forgot.body`. No red, no shake, no sound.
- PIN setup (`src/screens/PinSetup.tsx`, route `pin`): river Panel `pin.intro` + bold `pin.warning`, step line `pin.step.current` (only when changing: the old PIN is checked first, counting against the same wrong-PIN limit) then `pin.step.new` then `pin.step.repeat`, PinPad, lantern Panel `pin.mismatch`. On success: toast `toast.pinSaved`, back to Settings.
- Settings: Card `settings.pin.title` with `settings.pin.on` / `settings.pin.off`, Secondary `settings.pin.set` or `settings.pin.change`, quiet danger `settings.pin.remove` (Dialog `settings.pin.remove.*`, toast `toast.pinRemoved`).
- People: while no PIN is set, a river Panel `people.pinHint` with TextButton `settings.pin.set` above the list.
- The area closes again on any screen that is not for the caregiver (Home, Help, camera screens) and after the app was out of sight for a minute. The camera on the photo step switches off when the PIN screen covers it. Messages under the keypad come from `src/screens/PinNotice.tsx`; the wait countdown is hidden from screen readers (they hear `lock.waitShort` once). There is no "forgot PIN → erase" button on purpose (the elder could wipe everything by accident).
