// Voice engine contract. Owned by the main session.
// Fully offline: no Web Speech API, no network.
// src/lib/voice/index.ts must export:
//   export function recordVoiceSample(options?: RecordOptions): Promise<VoiceCapture | null>
//   export function matchVoice(vector: Float32Array, people: Person[]): MatchResult
//   export function startVoiceNote(): Promise<NoteRecorder>
//   export class MicError extends Error { code: DeviceError }

import type { MatchResult, Person } from '../types';

export interface RecordOptions {
  /** Abort to stop listening and release the microphone. The promise then resolves to null. */
  signal?: AbortSignal;
  /** Called a few times per second with the current loudness (0..1) for a level meter. */
  onLevel?: (rms: number) => void;
}

export interface VoiceCapture {
  /** Voice fingerprint built from all speech frames in the sample. */
  vector: Float32Array;
  /** How much of the sample was actual speech. */
  voicedMs: number;
}

/**
 * recordVoiceSample: opens the microphone, waits for speech (up to VOICE.waitForSpeechMs),
 * records VOICE.sampleMs, releases the microphone, and returns the voice print.
 * Returns null when there was no speech or less than VOICE.minVoicedMs of it.
 * Throws MicError when the microphone cannot be opened.
 */
export type RecordVoiceSample = (options?: RecordOptions) => Promise<VoiceCapture | null>;

/**
 * matchVoice (pure function): distance to a person = smallest distance to any of
 * that person's voice samples. Same strict rule as faces, using VOICE.maxDistance
 * and VOICE.minMargin. People without voice samples are ignored.
 */
export type MatchVoice = (vector: Float32Array, people: Person[]) => MatchResult;

export interface RecordedNote {
  audio: ArrayBuffer;
  mimeType: string;
  durationMs: number;
}

export interface NoteOptions {
  /**
   * Called when the recording ended by itself (app went to the background, time limit,
   * microphone lost). Not called after stop() or cancel(). The owner should then call stop()
   * to get the audio that was recorded.
   */
  onEnd?: () => void;
}

export interface NoteRecorder {
  /** Stops recording, releases the microphone and returns the audio. */
  stop(): Promise<RecordedNote>;
  /** Stops and throws the audio away. */
  cancel(): void;
}

/**
 * startVoiceNote: starts recording a voice note right away (called from a button press).
 * Stops by itself at VOICE.noteMaxMs. Throws MicError when the microphone cannot be opened.
 */
export type StartVoiceNote = (options?: NoteOptions) => Promise<NoteRecorder>;
