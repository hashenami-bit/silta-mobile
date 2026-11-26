import { describe, expect, it } from 'vitest';
import { ALBUM } from '../config';
import type { Person } from '../types';
import { answer, createSession, eligiblePeople, next } from './index';
import type { Rng, SessionState } from './index';

function seeded(seed: number): Rng {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

function person(n: number, photos = 2): Person {
  return {
    id: `p${n}`,
    name: `Name${n}`,
    kinship: { preset: 'friend', custom: '' },
    notes: '',
    photos: Array.from({ length: photos }, (_, i) => ({
      id: `p${n}-ph${i}`,
      dataUrl: `data:p${n}-${i}`,
      descriptor: new Float32Array(0),
      createdAt: 0,
    })),
    voiceSamples: [],
    consent: { caregiverName: 'c', personAgreed: true, agreedAt: 0 },
    createdAt: 0,
    updatedAt: 0,
  };
}

const many = Array.from({ length: 8 }, (_, i) => person(i));

function start(people: Person[], seed = 1, browseOnly = false): SessionState {
  const s = createSession(people, { browseOnly, rng: seeded(seed) });
  if (!s) throw new Error('no session');
  return s;
}

function rightId(s: SessionState): string {
  return s.cards[s.index].person.id;
}

function wrongId(s: SessionState): string {
  if (s.step.kind !== 'prompt') throw new Error('not a prompt');
  return s.step.choices.find((c) => c.personId !== rightId(s))!.personId;
}

/** Plays a whole session with a chooser; returns every step kind seen. */
function play(s: SessionState, pick: (s: SessionState) => string) {
  const trail: string[] = [];
  let guard = 0;
  while (s.step.kind !== 'end' && guard++ < 200) {
    trail.push(`${s.step.kind}:${rightId(s)}`);
    s = s.step.kind === 'prompt' ? answer(s, pick(s)) : next(s);
  }
  return { s, trail };
}

describe('album session', () => {
  it('needs two eligible people', () => {
    expect(createSession([], { browseOnly: false })).toBeNull();
    expect(createSession([person(1)], { browseOnly: false })).toBeNull();
    expect(createSession([person(1), person(2, 0)], { browseOnly: false })).toBeNull();
    expect(eligiblePeople([person(1), person(2, 0)])).toHaveLength(1);
    expect(createSession([person(1), person(2)], { browseOnly: false })).not.toBeNull();
  });

  it('uses up to cardsPerSession distinct people and one of their photos', () => {
    const s = start(many);
    expect(s.cards).toHaveLength(ALBUM.cardsPerSession);
    expect(new Set(s.cards.map((c) => c.person.id)).size).toBe(ALBUM.cardsPerSession);
    for (const c of s.cards) {
      expect(c.person.photos.map((p) => p.dataUrl)).toContain(c.photoUrl);
    }
    expect(start([person(1), person(2)]).cards).toHaveLength(2);
  });

  it('always studies a person before asking about them', () => {
    for (let seed = 1; seed < 20; seed++) {
      const { trail } = play(start(many, seed), rightId);
      const seen = new Set<string>();
      for (const entry of trail) {
        const [kind, id] = entry.split(':');
        if (kind === 'study') seen.add(id);
        if (kind === 'prompt') expect(seen.has(id)).toBe(true);
      }
    }
  });

  it('prompt choices hold the right person once, with ALBUM.choices entries', () => {
    for (let seed = 1; seed < 30; seed++) {
      let s = next(start(many, seed));
      if (s.step.kind !== 'prompt') throw new Error('expected prompt');
      const ids = s.step.choices.map((c) => c.personId);
      expect(ids.filter((id) => id === rightId(s))).toHaveLength(1);
      expect(ids).toHaveLength(ALBUM.choices);
      expect(new Set(ids).size).toBe(ids.length);
      s = answer(s, wrongId(s));
      s = next(s);
      if (s.step.kind !== 'prompt') throw new Error('expected retry prompt');
      expect(s.step.choices.filter((c) => c.personId === rightId(s))).toHaveLength(1);
    }
  });

  it('right answer: praise, no retry, moves on', () => {
    let s = next(start(many));
    const first = rightId(s);
    s = answer(s, first);
    expect(s.step.kind).toBe('feedback');
    if (s.step.kind === 'feedback') {
      expect(s.step.right).toBe(true);
      expect([1, 2, 3]).toContain(s.step.praise);
    }
    s = next(s);
    expect(s.step.kind).toBe('study');
    expect(rightId(s)).not.toBe(first);
    expect(s.progress.current).toBe(2);
  });

  it('wrong answer: correction, exactly one retry, then moves on', () => {
    let s = next(start(many));
    const first = rightId(s);
    s = answer(s, wrongId(s));
    expect(s.step.kind).toBe('feedback');
    if (s.step.kind === 'feedback') expect(s.step.right).toBe(false);
    s = next(s);
    expect(s.step.kind).toBe('prompt');
    expect(rightId(s)).toBe(first);
    if (s.step.kind === 'prompt') expect(s.step.attempt).toBe(2);
    // Wrong again: correction, then on to the next person (never a third question).
    s = answer(s, wrongId(s));
    expect(s.step.kind).toBe('feedback');
    s = next(s);
    expect(s.step.kind).toBe('study');
    expect(rightId(s)).not.toBe(first);
  });

  it('a right tap on the retry works and does not count as first try', () => {
    let s = next(start(many));
    s = answer(s, wrongId(s));
    s = next(s);
    s = answer(s, rightId(s));
    expect(s.step.kind === 'feedback' && s.step.right).toBe(true);
    expect(s.correctFirstTry).toBe(0);
  });

  it('browse-only has no prompts and ends on the end card', () => {
    const { s, trail } = play(start(many, 3, true), rightId);
    expect(trail.every((e) => e.startsWith('study:'))).toBe(true);
    expect(trail).toHaveLength(ALBUM.cardsPerSession);
    expect(s.step.kind).toBe('end');
    expect(s.shown).toBe(ALBUM.cardsPerSession);
    expect(s.correctFirstTry).toBe(0);
  });

  it('always ends on the end card, whatever is tapped', () => {
    for (let seed = 1; seed < 20; seed++) {
      expect(play(start(many, seed), rightId).s.step.kind).toBe('end');
      expect(play(start(many, seed), wrongId).s.step.kind).toBe('end');
      const s = play(start(many, seed), (st) =>
        seed % 2 ? rightId(st) : wrongId(st),
      ).s;
      expect(s.step.kind).toBe('end');
      expect(s.progress.current).toBe(s.progress.total);
    }
  });

  it('tallies are right', () => {
    const allRight = play(start(many, 5), rightId).s;
    expect(allRight.shown).toBe(ALBUM.cardsPerSession);
    expect(allRight.correctFirstTry).toBe(ALBUM.cardsPerSession);

    const allWrongFirst = play(start(many, 5), (st) =>
      st.step.kind === 'prompt' && st.step.attempt === 1 ? wrongId(st) : rightId(st),
    ).s;
    expect(allWrongFirst.shown).toBe(ALBUM.cardsPerSession);
    expect(allWrongFirst.correctFirstTry).toBe(0);

    // Mid-session: 2 people reached, first answered right.
    let s = next(start(many, 5));
    s = answer(s, rightId(s));
    s = next(s);
    expect(s.shown).toBe(2);
    expect(s.correctFirstTry).toBe(1);
  });

  it('ignores answers when there is no prompt', () => {
    const s = start(many);
    expect(answer(s, rightId(s))).toBe(s);
    const e = play(s, rightId).s;
    expect(next(e)).toBe(e);
  });

  it('is deterministic with a seeded rng', () => {
    const a = play(start(many, 42), wrongId).trail;
    const b = play(start(many, 42), wrongId).trail;
    expect(a).toEqual(b);
    expect(start(many, 42).cards.map((c) => c.photoUrl)).toEqual(
      start(many, 42).cards.map((c) => c.photoUrl),
    );
  });

  it('with only two people, choices are both of them', () => {
    const s = next(start([person(1), person(2)]));
    expect(s.step.kind === 'prompt' && s.step.choices.map((c) => c.personId).sort()).toEqual([
      'p1',
      'p2',
    ]);
  });
});
