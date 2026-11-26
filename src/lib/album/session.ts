// Family Album session rules. Pure logic: no React, no DOM.
// Errorless learning: a person is always studied first, a wrong tap is met with
// the right answer, and the same person is asked once more. Never a third time.

import { ALBUM } from '../config';
import type { Id, Person } from '../types';

export type Rng = () => number;

/** One person in the session, with the photo chosen for this session. */
export interface SessionCard {
  person: Person;
  photoUrl: string;
}

export interface Choice {
  personId: Id;
  name: string;
}

export type Step =
  | { kind: 'study' }
  | { kind: 'prompt'; attempt: 1 | 2; choices: Choice[] }
  | {
      kind: 'feedback';
      attempt: 1 | 2;
      choices: Choice[];
      chosenId: Id;
      /** true = right tap (praise). false = gentle correction. Never shown as "wrong". */
      right: boolean;
      /** Which praise text to use (album.praise.1..3). */
      praise: 1 | 2 | 3;
    }
  | { kind: 'end' };

export interface SessionState {
  readonly cards: readonly SessionCard[];
  readonly pool: readonly Person[];
  readonly browseOnly: boolean;
  readonly rng: Rng;
  /** Index of the current person in `cards`. */
  readonly index: number;
  readonly step: Step;
  /** Counted in people, not steps. At the end, current equals total. */
  readonly progress: { readonly current: number; readonly total: number };
  /** Tallies for the session log. */
  readonly shown: number;
  readonly correctFirstTry: number;
}

export interface SessionOptions {
  browseOnly: boolean;
  rng?: Rng;
}

/** People who have at least one photo. */
export function eligiblePeople(people: readonly Person[]): Person[] {
  return people.filter((p) => p.photos.length > 0);
}

function pickIndex(rng: Rng, length: number): number {
  return Math.min(length - 1, Math.floor(rng() * length));
}

function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = pickIndex(rng, i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function sameName(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function makeChoices(right: Person, pool: readonly Person[], rng: Rng): Choice[] {
  const others = shuffle(
    pool.filter((p) => p.id !== right.id && !sameName(p.name, right.name)),
    rng,
  ).slice(0, Math.max(0, ALBUM.choices - 1));
  return shuffle([right, ...others], rng).map((p) => ({ personId: p.id, name: p.name }));
}

/** Starts a session, or returns null when fewer than 2 people can be shown. */
export function createSession(
  people: readonly Person[],
  options: SessionOptions,
): SessionState | null {
  const rng = options.rng ?? Math.random;
  const pool = eligiblePeople(people);
  if (pool.length < 2) return null;
  const cards = shuffle(pool, rng)
    .slice(0, ALBUM.cardsPerSession)
    .map((person): SessionCard => {
      const photo = person.photos[pickIndex(rng, person.photos.length)];
      return { person, photoUrl: photo.dataUrl };
    });
  return {
    cards,
    pool,
    browseOnly: options.browseOnly,
    rng,
    index: 0,
    step: { kind: 'study' },
    progress: { current: 1, total: cards.length },
    shown: 1,
    correctFirstTry: 0,
  };
}

/** The person on screen now, or null at the end. */
export function currentCard(state: SessionState): SessionCard | null {
  return state.step.kind === 'end' ? null : state.cards[state.index];
}

/** True when the study card on screen is the last one of a browse-only session. */
export function isLastStudy(state: SessionState): boolean {
  return state.browseOnly && state.step.kind === 'study' && state.index === state.cards.length - 1;
}

function advance(state: SessionState): SessionState {
  const nextIndex = state.index + 1;
  if (nextIndex >= state.cards.length) {
    return {
      ...state,
      step: { kind: 'end' },
      progress: { current: state.cards.length, total: state.cards.length },
    };
  }
  return {
    ...state,
    index: nextIndex,
    step: { kind: 'study' },
    progress: { current: nextIndex + 1, total: state.cards.length },
    shown: state.shown + 1,
  };
}

function ask(state: SessionState, attempt: 1 | 2): SessionState {
  const choices = makeChoices(state.cards[state.index].person, state.pool, state.rng);
  // Not enough different names to ask a fair question: skip the question.
  if (choices.length < 2) return advance(state);
  return { ...state, step: { kind: 'prompt', attempt, choices } };
}

/** The elder taps a name. Only counts on a prompt. */
export function answer(state: SessionState, personId: Id): SessionState {
  const step = state.step;
  if (step.kind !== 'prompt') return state;
  if (!step.choices.some((c) => c.personId === personId)) return state;
  const right = personId === state.cards[state.index].person.id;
  const praise = (pickIndex(state.rng, 3) + 1) as 1 | 2 | 3;
  return {
    ...state,
    correctFirstTry: state.correctFirstTry + (right && step.attempt === 1 ? 1 : 0),
    step: {
      kind: 'feedback',
      attempt: step.attempt,
      choices: step.choices,
      chosenId: personId,
      right,
      praise,
    },
  };
}

/** The "next / continue" button. */
export function next(state: SessionState): SessionState {
  const step = state.step;
  switch (step.kind) {
    case 'study':
      return state.browseOnly ? advance(state) : ask(state, 1);
    case 'feedback':
      if (!step.right && step.attempt === 1) return ask(state, 2);
      return advance(state);
    default:
      return state;
  }
}
