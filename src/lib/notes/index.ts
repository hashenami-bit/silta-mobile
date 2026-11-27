// Rules for the notes about a person. Pure logic: no React, no DOM, no storage.

import { NOTES } from '../config';
import type { Id, MemoryNote, Person, VoiceNote } from '../types';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Written memories the elder may see. "Caregiver only" notes never pass this filter. */
export function elderNotes(person: Person): MemoryNote[] {
  return person.memoryNotes.filter((n) => n.visibility === 'elder' && n.text.trim() !== '');
}

/** Voice messages the elder may hear. "Caregiver only" ones never pass this filter. */
export function elderVoiceNotes(notes: readonly VoiceNote[]): VoiceNote[] {
  return notes.filter((n) => n.visibility === 'elder');
}

/** Picks one item for this showing; a different `turn` gives the next one. */
export function pickByTurn<T>(items: readonly T[], turn: number): T | null {
  if (items.length === 0) return null;
  const index = ((Math.floor(turn) % items.length) + items.length) % items.length;
  return items[index];
}

const shownCount = new Map<Id, number>();

/**
 * A number that grows each time this person's card is shown and also moves on every day,
 * so the elder sees a different memory next time. Not saved: it starts again when the app restarts.
 */
export function nextTurn(personId: Id, now: number = Date.now()): number {
  const shown = shownCount.get(personId) ?? 0;
  shownCount.set(personId, shown + 1);
  return Math.floor(now / DAY_MS) + shown;
}

/** How many more notes (written + voice) fit for one person. Never below 0. */
export function notesLeft(writtenCount: number, voiceCount: number): number {
  return Math.max(0, NOTES.maxPerPerson - writtenCount - voiceCount);
}

/** Trims and cuts the who-line to its limit. */
export function cleanWhoLine(text: string): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, NOTES.whoLineMaxChars);
}

/** 'YYYY-MM-DD' → 'DD.MM.YYYY' (the usual form in both languages). Anything else → ''. */
export function formatBirthday(value: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : '';
}
