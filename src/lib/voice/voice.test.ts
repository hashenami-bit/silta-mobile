import { describe, expect, it } from 'vitest';
import { VOICE } from '../config';
import type { Person } from '../types';
import { VECTOR_LENGTH, resampleTo16k, voicePrintFromPcm } from './features';
import { matchVoice, voiceDistance } from './match';

// ---------- synthetic voices ----------

/** Small deterministic random generator (same seed = same numbers). */
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

interface Voice {
  /** Fundamental (pitch) in Hz. */
  f0: number;
  /** How fast the harmonics fade with height (bigger = darker voice). */
  tilt: number;
  /** Three resonance peaks in Hz. */
  formants: [number, number, number];
}

/**
 * A voice is a stack of harmonics with resonance peaks. Each take wobbles pitch and
 * resonances a little (like saying different words), has syllable-like gaps and noise.
 */
function speak(
  voice: Voice,
  seconds: number,
  rate: number,
  gain: number,
  seed: number,
  noise = 0.004,
): Float32Array {
  const r = rng(seed);
  const wobble = () => 1 + (r() - 0.5) * 0.08; // +-4 %
  const f0 = voice.f0 * wobble();
  const formants = voice.formants.map((f) => f * wobble());
  const amps: number[] = [];
  for (let h = 1; h * f0 < Math.min(rate / 2, 8000) - 200; h++) {
    const f = h * f0;
    let a = Math.pow(h, -voice.tilt);
    for (const fm of formants) a += 1.5 * Math.exp(-(((f - fm) / 150) ** 2));
    amps.push(a);
  }
  const n = Math.floor(seconds * rate);
  const out = new Float32Array(n);
  const vibrato = 0.5 + r();
  const syllable = 2.5 + r();
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / rate;
    phase += (2 * Math.PI * f0 * (1 + 0.05 * Math.sin(2 * Math.PI * vibrato * t))) / rate;
    let s = 0;
    for (let h = 0; h < amps.length; h++) s += amps[h] * Math.sin((h + 1) * phase);
    const open = Math.sin(2 * Math.PI * syllable * t) > -0.7 ? 1 : 0;
    out[i] = gain * 0.1 * s * open + (r() - 0.5) * noise;
  }
  return out;
}

const ALICE: Voice = { f0: 110, tilt: 1.2, formants: [600, 1100, 2400] };
const BOB: Voice = { f0: 120, tilt: 1.0, formants: [700, 1500, 2600] };
const CARA: Voice = { f0: 210, tilt: 1.8, formants: [500, 1700, 2800] };

function print(voice: Voice, seconds: number, rate: number, gain: number, seed: number): Float32Array {
  const capture = voicePrintFromPcm(speak(voice, seconds, rate, gain, seed), rate);
  if (!capture) throw new Error('test voice produced no print');
  return capture.vector;
}

function person(id: string, vectors: Float32Array[]): Person {
  return {
    id,
    name: id,
    kinship: { preset: null, custom: '' },
    whoLine: '',
    birthday: '',
    phone: '',
    city: '',
    memoryNotes: [],
    photos: [],
    voiceSamples: vectors.map((vector, i) => ({ id: `${id}-${i}`, vector, createdAt: 0 })),
    consent: { caregiverName: 'c', personAgreed: true, agreedAt: 0 },
    createdAt: 0,
    updatedAt: 0,
  };
}

// ---------- voice print ----------

describe('voicePrintFromPcm', () => {
  it('returns null for silence', () => {
    expect(voicePrintFromPcm(new Float32Array(16000 * 3), 16000)).toBeNull();
  });

  it('returns null for very quiet noise', () => {
    const r = rng(1);
    const noise = new Float32Array(16000 * 3).map(() => (r() - 0.5) * 0.01);
    expect(voicePrintFromPcm(noise, 16000)).toBeNull();
  });

  it('returns null for a recording that is too short', () => {
    expect(voicePrintFromPcm(new Float32Array(100), 16000)).toBeNull();
    expect(voicePrintFromPcm(new Float32Array(0), 16000)).toBeNull();
  });

  it('returns null when there is too little speech', () => {
    const full = speak(ALICE, 3, 16000, 1, 1);
    const short = new Float32Array(full.length);
    const keep = Math.floor(16000 * (VOICE.minVoicedMs / 1000) * 0.4); // well under the minimum
    short.set(full.subarray(0, keep));
    expect(voicePrintFromPcm(short, 16000)).toBeNull();
  });

  it('returns a vector of fixed length with finite numbers', () => {
    const capture = voicePrintFromPcm(speak(ALICE, 3, 16000, 1, 1), 16000);
    expect(capture).not.toBeNull();
    expect(capture!.vector.length).toBe(VECTOR_LENGTH);
    expect(capture!.voicedMs).toBeGreaterThanOrEqual(VOICE.minVoicedMs);
    for (const x of capture!.vector) expect(Number.isFinite(x)).toBe(true);
  });

  it('resamples to 16 kHz with the right length', () => {
    expect(resampleTo16k(new Float32Array(48000), 48000).length).toBe(16000);
    expect(resampleTo16k(new Float32Array(8000), 8000).length).toBe(16000);
    expect(resampleTo16k(new Float32Array(10), 0).length).toBe(0);
  });
});

describe('same voice vs different voices', { timeout: 30000 }, () => {
  const a1 = print(ALICE, 3, 16000, 1, 11);
  const sameDistances = [
    voiceDistance(a1, print(ALICE, 4, 16000, 0.4, 12)), // longer and quieter
    voiceDistance(a1, print(ALICE, 2.5, 16000, 2.5, 13)), // shorter and louder
    voiceDistance(a1, print(ALICE, 3, 44100, 1, 14)), // other phone sample rate
    voiceDistance(a1, print(ALICE, 3, 48000, 1, 15)),
  ];
  const diffDistances = [
    voiceDistance(a1, print(BOB, 3, 16000, 1, 21)),
    voiceDistance(a1, print(CARA, 3, 16000, 1, 22)),
  ];

  it('two takes of the same voice are close', () => {
    for (const d of sameDistances) expect(d).toBeLessThan(VOICE.maxDistance / 2);
  });

  it('clearly different voices are farther away', () => {
    for (const d of diffDistances) expect(d).toBeGreaterThan(Math.max(...sameDistances) * 2);
  });

  it('is a distance: identical vectors give 0, different lengths give Infinity', () => {
    expect(voiceDistance(a1, a1)).toBeCloseTo(0, 6);
    expect(voiceDistance(a1, new Float32Array(3))).toBe(Infinity);
  });
});

// ---------- matching ----------

/** A vector whose cosine distance to [1, 0] is exactly d. `side` only picks a direction. */
function atDistance(d: number, side: 1 | -1 = 1): Float32Array {
  const angle = Math.acos(1 - d);
  return new Float32Array([Math.cos(angle), side * Math.sin(angle)]);
}
const QUERY = new Float32Array([1, 0]);
const near = VOICE.maxDistance * 0.3;

describe('matchVoice', () => {
  it('returns unsure for no people', () => {
    expect(matchVoice(QUERY, [])).toEqual({ kind: 'unsure' });
  });

  it('ignores people without voice samples', () => {
    expect(matchVoice(QUERY, [person('a', [])])).toEqual({ kind: 'unsure' });
    const result = matchVoice(QUERY, [person('a', []), person('b', [atDistance(near)])]);
    expect(result.kind).toBe('match');
    if (result.kind === 'match') expect(result.personId).toBe('b');
  });

  it('matches one close person', () => {
    const result = matchVoice(QUERY, [person('a', [atDistance(near)])]);
    expect(result.kind).toBe('match');
    if (result.kind === 'match') expect(result.distance).toBeCloseTo(near, 6);
  });

  it('is unsure when the best person is too far', () => {
    const far = VOICE.maxDistance * 1.2;
    expect(matchVoice(QUERY, [person('a', [atDistance(far)])])).toEqual({ kind: 'unsure' });
  });

  it('matches when the best is clearly ahead of the second', () => {
    const second = near + VOICE.minMargin * 2;
    const result = matchVoice(QUERY, [
      person('a', [atDistance(second, -1)]),
      person('b', [atDistance(near)]),
    ]);
    expect(result).toMatchObject({ kind: 'match', personId: 'b' });
  });

  it('is unsure when two people are equally close', () => {
    const result = matchVoice(QUERY, [
      person('a', [atDistance(near, 1)]),
      person('b', [atDistance(near, -1)]),
    ]);
    expect(result).toEqual({ kind: 'unsure' });
  });

  it('is unsure when the margin is just too small', () => {
    const second = near + VOICE.minMargin * 0.8;
    const result = matchVoice(QUERY, [
      person('a', [atDistance(near)]),
      person('b', [atDistance(second, -1)]),
    ]);
    expect(result).toEqual({ kind: 'unsure' });
  });

  it("uses a person's closest sample", () => {
    const result = matchVoice(QUERY, [
      person('a', [atDistance(VOICE.maxDistance * 2), atDistance(near)]),
      person('b', [atDistance(near + VOICE.minMargin * 3, -1)]),
    ]);
    expect(result).toMatchObject({ kind: 'match', personId: 'a' });
  });

  it('treats vectors of different length as no match', () => {
    const other = person('a', [new Float32Array([1, 0, 0])]);
    expect(matchVoice(QUERY, [other])).toEqual({ kind: 'unsure' });
  });

  it('names the right synthetic person', { timeout: 30000 }, () => {
    const people = [
      person('alice', [print(ALICE, 3, 16000, 1, 31), print(ALICE, 3, 16000, 1, 32)]),
      person('bob', [print(BOB, 3, 16000, 1, 33)]),
      person('cara', [print(CARA, 3, 16000, 1, 34)]),
    ];
    const result = matchVoice(print(CARA, 3, 16000, 0.7, 35), people);
    expect(result).toMatchObject({ kind: 'match', personId: 'cara' });
  });
});
