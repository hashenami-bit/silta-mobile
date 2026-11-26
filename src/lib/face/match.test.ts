import { describe, expect, it } from 'vitest';
import { FACE } from '../config';
import type { Person } from '../types';
import { createStableMatcher, euclideanDistance, matchFace } from './match';

const LEN = 128;

/** A descriptor that is `d` away from the all-zero descriptor along axis `axis`. */
function at(d: number, axis = 0): Float32Array {
  const v = new Float32Array(LEN);
  v[axis] = d;
  return v;
}

const QUERY = new Float32Array(LEN);

function person(id: string, descriptors: Float32Array[]): Person {
  return {
    id,
    name: id,
    kinship: { preset: 'friend', custom: '' },
    notes: '',
    photos: descriptors.map((descriptor, i) => ({
      id: `${id}-p${i}`,
      dataUrl: '',
      descriptor,
      createdAt: 0,
    })),
    voiceSamples: [],
    consent: {} as Person['consent'],
    createdAt: 0,
    updatedAt: 0,
  };
}

const NEAR = FACE.maxDistance - 0.01;
const FAR = FACE.maxDistance + 0.01;

describe('euclideanDistance', () => {
  it('is 0 for equal vectors and correct for a simple case', () => {
    expect(euclideanDistance(at(0.3), at(0.3))).toBe(0);
    const a = new Float32Array(LEN);
    const b = new Float32Array(LEN);
    a[0] = 3;
    b[1] = 4;
    expect(euclideanDistance(a, b)).toBeCloseTo(5, 5);
  });

  it('is Infinity for different lengths', () => {
    expect(euclideanDistance(new Float32Array(127), new Float32Array(LEN))).toBe(Infinity);
  });
});

describe('matchFace', () => {
  it('is unsure with an empty people list', () => {
    expect(matchFace(QUERY, [])).toEqual({ kind: 'unsure' });
  });

  it('is unsure when everyone has zero photos', () => {
    expect(matchFace(QUERY, [person('a', []), person('b', [])])).toEqual({ kind: 'unsure' });
  });

  it('matches an exact descriptor', () => {
    const r = matchFace(QUERY, [person('a', [new Float32Array(LEN)])]);
    expect(r).toEqual({ kind: 'match', personId: 'a', distance: 0 });
  });

  it('matches a near descriptor with the right person', () => {
    const r = matchFace(QUERY, [person('a', [at(NEAR)]), person('b', [at(5, 1)])]);
    expect(r.kind).toBe('match');
    if (r.kind === 'match') {
      expect(r.personId).toBe('a');
      expect(r.distance).toBeCloseTo(NEAR, 5);
    }
  });

  it('is unsure just over maxDistance', () => {
    expect(matchFace(QUERY, [person('a', [at(FAR)])])).toEqual({ kind: 'unsure' });
  });

  it('is unsure when the only person is far away', () => {
    expect(matchFace(QUERY, [person('a', [at(2)])])).toEqual({ kind: 'unsure' });
  });

  it('is unsure when the second-best person is too close (margin rule)', () => {
    const best = 0.2;
    const second = best + FACE.minMargin - 0.01;
    const r = matchFace(QUERY, [person('a', [at(best)]), person('b', [at(second, 1)])]);
    expect(r).toEqual({ kind: 'unsure' });
  });

  it('matches when the second-best person is far enough (margin rule)', () => {
    const best = 0.2;
    const second = best + FACE.minMargin + 0.01;
    const r = matchFace(QUERY, [person('a', [at(best)]), person('b', [at(second, 1)])]);
    expect(r.kind).toBe('match');
    if (r.kind === 'match') expect(r.personId).toBe('a');
  });

  it('picks the right person regardless of list order', () => {
    const r = matchFace(QUERY, [person('b', [at(1, 1)]), person('a', [at(0.1)])]);
    expect(r.kind === 'match' && r.personId).toBe('a');
  });

  it('skips the margin rule with a single person', () => {
    const r = matchFace(QUERY, [person('a', [at(NEAR)]), person('empty', [])]);
    expect(r.kind).toBe('match');
  });

  it('uses the best of several photos for a person', () => {
    const r = matchFace(QUERY, [person('a', [at(3), at(0.1, 2), at(2, 3)])]);
    expect(r.kind === 'match' && r.personId).toBe('a');
    if (r.kind === 'match') expect(r.distance).toBeCloseTo(0.1, 5);
  });

  it('does not count a second photo of the same person as the runner-up', () => {
    // Two close photos of the same person must not trigger the margin rule.
    const r = matchFace(QUERY, [person('a', [at(0.2), at(0.21, 1)])]);
    expect(r.kind).toBe('match');
  });

  it('never matches a descriptor of the wrong length', () => {
    const short = new Float32Array(64);
    expect(matchFace(short, [person('a', [new Float32Array(LEN)])])).toEqual({ kind: 'unsure' });
    // A stored photo with the wrong length is ignored too.
    expect(matchFace(QUERY, [person('a', [new Float32Array(64)])])).toEqual({ kind: 'unsure' });
  });
});

describe('createStableMatcher', () => {
  const matchA = { kind: 'match', personId: 'a', distance: 0.1 } as const;
  const matchB = { kind: 'match', personId: 'b', distance: 0.1 } as const;
  const unsure = { kind: 'unsure' } as const;
  const none = { kind: 'none' } as const;

  /** Pushes `n` times and returns the last result. */
  function pushN(m: ReturnType<typeof createStableMatcher>, r: Parameters<typeof m.push>[0], n: number) {
    let out = unsure as ReturnType<typeof m.push>;
    for (let i = 0; i < n; i++) out = m.push(r);
    return out;
  }

  it('returns the match only after stableChecks wins in a row', () => {
    const m = createStableMatcher();
    for (let i = 1; i < FACE.stableChecks; i++) {
      expect(m.push(matchA)).toEqual(unsure);
    }
    expect(m.push(matchA)).toEqual(matchA);
    expect(m.push(matchA)).toEqual(matchA);
  });

  it('a different person restarts the streak', () => {
    const m = createStableMatcher();
    pushN(m, matchA, FACE.stableChecks - 1);
    expect(m.push(matchB)).toEqual((FACE.stableChecks as number) === 1 ? matchB : unsure);
    expect(pushN(m, matchB, FACE.stableChecks - 1)).toEqual(matchB);
  });

  it('unsure resets the streak and passes through', () => {
    const m = createStableMatcher();
    pushN(m, matchA, FACE.stableChecks - 1);
    expect(m.push(unsure)).toEqual(unsure);
    expect(m.push(matchA)).toEqual((FACE.stableChecks as number) === 1 ? matchA : unsure);
  });

  it('none resets the streak and passes through', () => {
    const m = createStableMatcher();
    pushN(m, matchA, FACE.stableChecks);
    expect(m.push(none)).toEqual(none);
    expect(m.push(matchA)).toEqual((FACE.stableChecks as number) === 1 ? matchA : unsure);
  });

  it('reset() clears the streak', () => {
    const m = createStableMatcher();
    pushN(m, matchA, FACE.stableChecks - 1);
    m.reset();
    expect(m.push(matchA)).toEqual((FACE.stableChecks as number) === 1 ? matchA : unsure);
  });

  it('passes unsure and none through on a fresh matcher', () => {
    const m = createStableMatcher();
    expect(m.push(unsure)).toEqual(unsure);
    expect(m.push(none)).toEqual(none);
  });
});
