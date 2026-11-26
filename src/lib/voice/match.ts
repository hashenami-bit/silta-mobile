// Strict voice matching. Pure code, no DOM.
//
// Distance: cosine distance = 1 - cos(angle between the two vectors).
//   0 = same direction, larger = more different. It ignores the overall size of
//   the vector, which fits a print that was already level-normalised.
// Rule (same as faces): the best person must be at or below VOICE.maxDistance AND
// beat the second-best person by at least VOICE.minMargin. Otherwise 'unsure'.

import { VOICE } from '../config';
import type { MatchResult, Person } from '../types';

/** Cosine distance. Returns Infinity when it cannot be computed (different length, empty, zero). */
export function voiceDistance(a: Float32Array, b: Float32Array): number {
  if (a.length === 0 || a.length !== b.length) return Infinity;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (!(na > 0) || !(nb > 0)) return Infinity;
  const d = 1 - dot / Math.sqrt(na * nb);
  return Number.isFinite(d) ? Math.max(0, d) : Infinity;
}

export function matchVoice(vector: Float32Array, people: Person[]): MatchResult {
  const ranked: { personId: string; distance: number }[] = [];
  for (const person of people) {
    let best = Infinity;
    for (const sample of person.voiceSamples) {
      best = Math.min(best, voiceDistance(vector, sample.vector));
    }
    if (Number.isFinite(best)) ranked.push({ personId: person.id, distance: best });
  }
  if (ranked.length === 0) return { kind: 'unsure' };

  ranked.sort((x, y) => x.distance - y.distance);
  const first = ranked[0];
  if (first.distance > VOICE.maxDistance) return { kind: 'unsure' };
  if (ranked.length > 1 && ranked[1].distance - first.distance < VOICE.minMargin) {
    return { kind: 'unsure' };
  }
  return { kind: 'match', personId: first.personId, distance: first.distance };
}
