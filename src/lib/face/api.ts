// Face engine contract. Owned by the main session.
// src/lib/face/index.ts must export:
//   export function getFaceEngine(): FaceEngine
//   export function matchFace(descriptor: Float32Array, people: Person[]): MatchResult
//   export function createStableMatcher(): StableMatcher
//   export function capturePhoto(video: HTMLVideoElement): string
//   export function useFaceWatch(options: FaceWatchOptions): FaceWatch

import type { RefObject } from 'react';
import type { MatchResult, Person } from '../types';

export type FaceSource = HTMLVideoElement | HTMLImageElement | HTMLCanvasElement;

export interface FaceDescription {
  /** Face fingerprint (128 numbers). */
  descriptor: Float32Array;
  /** Face position in source pixels. */
  box: { x: number; y: number; width: number; height: number };
  /** Detector confidence 0..1. Never shown to the user. */
  score: number;
}

export interface FaceEngine {
  /** Loads the model files from MODELS_PATH and warms them up. Safe to call many times. */
  load(): Promise<void>;
  isLoaded(): boolean;
  /**
   * Forget the loaded models, so the next load() reads the files and runs the self-check again.
   * For "try again" after the engine broke in the middle of a session.
   */
  reset(): void;
  /** Describes the largest face in the source, or null when no face is found. */
  describe(source: FaceSource): Promise<FaceDescription | null>;
}

/**
 * matchFace (pure function, no camera, no models):
 * distance to a person = smallest distance to any of that person's photos.
 * Returns 'match' only when best <= FACE.maxDistance AND (second - best) >= FACE.minMargin
 * (the margin rule is skipped when only one person is saved).
 * Returns 'unsure' otherwise. With no saved photos it returns 'unsure'.
 */
export type MatchFace = (descriptor: Float32Array, people: Person[]) => MatchResult;

/**
 * Smooths results over time. push() returns 'match' only after the same person
 * has matched FACE.stableChecks times in a row; before that it returns 'unsure'
 * for matches, and passes 'unsure' / 'none' through. reset() clears the history.
 */
export interface StableMatcher {
  push(result: MatchResult): MatchResult;
  reset(): void;
}

/**
 * capturePhoto: draws the current video frame to a canvas, scales the longest side
 * down to FACE.photoMaxSidePx, and returns a JPEG data URL (FACE.photoJpegQuality).
 * The image is NOT mirrored.
 */
export type CapturePhoto = (video: HTMLVideoElement) => string;

export interface FaceWatchOptions {
  video: RefObject<HTMLVideoElement | null>;
  people: Person[];
  /** The loop runs only while this is true (camera ready and screen wants checks). */
  enabled: boolean;
}

/**
 * useFaceWatch: React hook. While enabled, every FACE.checkIntervalMs it describes the
 * current video frame, runs matchFace and the stable matcher, and exposes the latest result.
 * Never overlaps two checks. Stops on unmount. `result` is null before the first check.
 */
export interface FaceWatch {
  result: MatchResult | null;
  /** True after FACE.maxFailedChecks checks in a row threw an error. The loop has stopped; reset() starts over. */
  failed: boolean;
  /** Clears the result, the failed flag and the stable-matcher history (e.g. "try again"). */
  reset(): void;
}
