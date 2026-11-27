// Every tuning number in one place. Owned by the main session.
// Start values only: they are tuned on the real test phone.

/** Shown in Settings. */
export const APP_VERSION = '0.1.0';

export const MODELS_PATH = `${import.meta.env.BASE_URL}models`;

export const FACE = {
  /** Tiny face detector input size (multiple of 32). Smaller is faster. */
  detectorInputSize: 224,
  /** Minimum detector confidence to accept a face. */
  detectorMinScore: 0.5,
  /** Time between identity checks while the camera is open. */
  checkIntervalMs: 1000,
  /** A match needs a distance at or below this (0 = identical; face-api default is 0.6). */
  maxDistance: 0.45,
  /** The best person must beat the second-best person by at least this much. */
  minMargin: 0.08,
  /** The same person must win this many checks in a row before a name is shown. */
  stableChecks: 2,
  /** Show the gentle "not sure" card after a face has stayed unnamed for this long. */
  unsureAfterMs: 4000,
  /**
   * Self-check after the models load: this device's numbers for the fixed test picture may be
   * at most this far from the reference numbers (same scale as maxDistance, and well under minMargin).
   * A desktop computer measured 0.000001. Above the limit the app uses the slower exact mode. See face/selfCheck.ts.
   */
  selfCheckMaxDistance: 0.02,
  /** This many failed checks in a row stop the camera screen and show the calm "did not work" card. */
  maxFailedChecks: 5,
  photosMin: 3,
  photosMax: 5,
  photoMaxSidePx: 640,
  photoJpegQuality: 0.8,
} as const;

export const VOICE = {
  /** Length of speech used for one voice print. */
  sampleMs: 3000,
  /** Give up waiting for speech after this long. */
  waitForSpeechMs: 8000,
  /** Loudness (RMS, 0..1) above which a frame counts as speech. */
  speechRms: 0.02,
  /** A sample needs at least this much actual speech to be used. */
  minVoicedMs: 1200,
  samplesPerPerson: 3,
  /** A match needs a distance at or below this (0 = identical). */
  maxDistance: 0.08,
  /** The best person must beat the second-best person by at least this much. */
  minMargin: 0.05,
  /** Longest voice note. */
  noteMaxMs: 30000,
} as const;

export const NOTES = {
  /** Longest who-line (the sentence under the name). */
  whoLineMaxChars: 80,
  /** Written memories plus voice notes for one person. */
  maxPerPerson: 10,
  /** Longest written memory. */
  textMaxChars: 200,
} as const;

export const LOCK = {
  /** Digits in the caregiver PIN. */
  pinLength: 4,
  /** Wrong PINs in a row before a wait is asked for. */
  maxTries: 5,
  /** Length of that wait. */
  waitMs: 30000,
  /** The caregiver area closes when the app was out of sight for at least this long. */
  backgroundMs: 60000,
  /** Work done to scramble the PIN (PBKDF2 rounds). Higher = slower to guess. */
  iterations: 150000,
} as const;

export const ALBUM = {
  /** Cards in one session. */
  cardsPerSession: 5,
  /** Name choices shown under a photo. */
  choices: 2,
} as const;
