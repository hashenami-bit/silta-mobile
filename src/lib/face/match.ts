// Pure face matching. No face-api.js and no DOM here, so it runs in plain Node tests.

import { FACE } from '../config';
import type { MatchResult, Person } from '../types';
import type { StableMatcher } from './api';

/** Euclidean distance between two descriptors. Different lengths never match. */
export function euclideanDistance(a: ArrayLike<number>, b: ArrayLike<number>): number {
  if (a.length !== b.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

/**
 * Strict match rule. A person's distance is the smallest distance to any of their photos.
 * 'match' only when best <= FACE.maxDistance and (second - best) >= FACE.minMargin
 * (margin skipped when only one person has photos). People with no photos are ignored.
 */
export function matchFace(descriptor: Float32Array, people: Person[]): MatchResult {
  let bestId: string | null = null;
  let best = Infinity;
  let second = Infinity;

  for (const person of people) {
    if (person.photos.length === 0) continue;
    let personBest = Infinity;
    for (const photo of person.photos) {
      const d = euclideanDistance(descriptor, photo.descriptor);
      if (d < personBest) personBest = d;
    }
    if (personBest < best) {
      second = best;
      best = personBest;
      bestId = person.id;
    } else if (personBest < second) {
      second = personBest;
    }
  }

  if (bestId === null || !Number.isFinite(best)) return { kind: 'unsure' };
  if (best > FACE.maxDistance) return { kind: 'unsure' };
  // second is Infinity when only one person is saved, so the margin check passes.
  if (second - best < FACE.minMargin) return { kind: 'unsure' };
  return { kind: 'match', personId: bestId, distance: best };
}

/** Needs the same person to match FACE.stableChecks times in a row before showing a match. */
export function createStableMatcher(): StableMatcher {
  let lastId: string | null = null;
  let streak = 0;

  return {
    push(result) {
      if (result.kind !== 'match') {
        lastId = null;
        streak = 0;
        return result;
      }
      if (result.personId === lastId) {
        streak += 1;
      } else {
        lastId = result.personId;
        streak = 1;
      }
      return streak >= FACE.stableChecks ? result : { kind: 'unsure' };
    },
    reset() {
      lastId = null;
      streak = 0;
    },
  };
}
