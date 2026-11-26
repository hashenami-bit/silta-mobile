// Shared data types for the Silta app. Owned by the main session.

export type Id = string;
export type Lang = 'uz' | 'ru';

/** Preset kinship words. The visible text for each lives in src/i18n. */
export type KinshipKey =
  | 'daughter'
  | 'son'
  | 'wife'
  | 'husband'
  | 'granddaughter'
  | 'grandson'
  | 'daughterInLaw'
  | 'sonInLaw'
  | 'olderSister'
  | 'youngerSister'
  | 'olderBrother'
  | 'youngerBrother'
  | 'niece'
  | 'nephew'
  | 'friend'
  | 'neighbour'
  | 'helper';

/** Either a preset, or free text typed by the caregiver (used when preset is null). */
export interface Kinship {
  preset: KinshipKey | null;
  custom: string;
}

export interface PersonPhoto {
  id: Id;
  /** JPEG as a data URL, longest side <= FACE.photoMaxSidePx. */
  dataUrl: string;
  /** Face fingerprint from the face engine (128 numbers). */
  descriptor: Float32Array;
  createdAt: number;
}

export interface VoiceSample {
  id: Id;
  /** Voice fingerprint from the voice engine. */
  vector: Float32Array;
  createdAt: number;
}

export interface Consent {
  /** Name of the caregiver or legal representative who gave consent. */
  caregiverName: string;
  /** The enrolled family member agreed to have their face saved on this phone. */
  personAgreed: boolean;
  agreedAt: number;
}

export interface Person {
  id: Id;
  name: string;
  kinship: Kinship;
  notes: string;
  /** FACE.photosMin to FACE.photosMax photos. photos[0] is the main picture. */
  photos: PersonPhoto[];
  /** Empty if no voice was recorded. */
  voiceSamples: VoiceSample[];
  consent: Consent;
  createdAt: number;
  updatedAt: number;
}

export interface VoiceNote {
  id: Id;
  personId: Id;
  audio: ArrayBuffer;
  mimeType: string;
  durationMs: number;
  createdAt: number;
}

export interface Settings {
  /** null until the language is chosen on first start. */
  lang: Lang | null;
  /** Album shows photos and names only, with no questions. */
  browseOnly: boolean;
  /** Voice recognition is offered on the home screen. */
  voiceEnabled: boolean;
  /** Who usually starts sessions on this phone; written to the session history. */
  defaultStarter: SessionStarter;
}

export type SessionType = 'album' | 'face' | 'voice';
export type SessionStarter = 'caregiver' | 'elder' | 'relative' | 'unknown';
export type SessionOutcome = 'completed' | 'named' | 'unsure' | 'cancelled';

export interface SessionLogEntry {
  id: Id;
  type: SessionType;
  startedBy: SessionStarter;
  startedAt: number;
  endedAt: number;
  outcome: SessionOutcome;
  /** The person named in a face or voice session, if any. */
  personId: Id | null;
  /** Album only: cards shown and cards answered right on the first try. */
  cards: number;
  correctFirstTry: number;
}

/**
 * Result of comparing a face or a voice with the saved people.
 * - match:  confident enough to show a name
 * - unsure: a face/voice was found but it is not safe to name anyone
 * - none:   no face/voice found in the input
 */
export type MatchResult =
  | { kind: 'match'; personId: Id; distance: number }
  | { kind: 'unsure' }
  | { kind: 'none' };

/** Why the camera or microphone could not start. */
export type DeviceError = 'denied' | 'notFound' | 'inUse' | 'unsupported' | 'unknown';
