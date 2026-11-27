import { describe, expect, it } from 'vitest';
import { NOTES } from '../config';
import type { MemoryNote, Person } from '../types';
import { cleanWhoLine, elderNotes, elderVoiceNotes, formatBirthday, nextTurn, notesLeft, pickByTurn } from './index';

function note(id: string, visibility: MemoryNote['visibility'], text = `text ${id}`): MemoryNote {
  return { id, text, visibility, createdAt: 1 };
}

function person(memoryNotes: MemoryNote[]): Person {
  return {
    id: 'p',
    name: 'Dilnoza',
    kinship: { preset: 'daughter', custom: '' },
    whoLine: '',
    birthday: '',
    phone: '',
    city: '',
    memoryNotes,
    photos: [],
    voiceSamples: [],
    consent: { caregiverName: 'Care', personAgreed: true, agreedAt: 1 },
    createdAt: 1,
    updatedAt: 1,
  };
}

describe('elderNotes', () => {
  it('never returns a "caregiver only" note', () => {
    const p = person([note('a', 'elder'), note('b', 'caregiver'), note('c', 'elder')]);
    expect(elderNotes(p).map((n) => n.id)).toEqual(['a', 'c']);
  });

  it('returns nothing when every note is caregiver only', () => {
    expect(elderNotes(person([note('a', 'caregiver')]))).toEqual([]);
  });

  it('skips empty text', () => {
    expect(elderNotes(person([note('a', 'elder', '   ')]))).toEqual([]);
  });
});

describe('pickByTurn', () => {
  it('returns null for an empty list', () => {
    expect(pickByTurn([], 3)).toBeNull();
  });

  it('walks through the list and starts again', () => {
    const items = ['a', 'b', 'c'];
    expect([0, 1, 2, 3, 4].map((turn) => pickByTurn(items, turn))).toEqual(['a', 'b', 'c', 'a', 'b']);
  });

  it('copes with a negative turn', () => {
    expect(pickByTurn(['a', 'b', 'c'], -1)).toBe('c');
  });
});

describe('nextTurn', () => {
  it('moves on with each showing and with each day', () => {
    const day = 24 * 60 * 60 * 1000;
    const first = nextTurn('turn-test', 10 * day);
    expect(nextTurn('turn-test', 10 * day)).toBe(first + 1);
    expect(nextTurn('turn-test', 11 * day)).toBe(first + 3);
  });
});

describe('notesLeft', () => {
  it('counts written and voice notes together', () => {
    expect(notesLeft(3, 2)).toBe(NOTES.maxPerPerson - 5);
    expect(notesLeft(NOTES.maxPerPerson, 0)).toBe(0);
    expect(notesLeft(NOTES.maxPerPerson, 4)).toBe(0);
  });
});

describe('cleanWhoLine', () => {
  it('trims, joins lines and cuts to the limit', () => {
    expect(cleanWhoLine('  Har juma\n sizga  osh olib keladi ')).toBe('Har juma sizga osh olib keladi');
    expect(cleanWhoLine('x'.repeat(200))).toHaveLength(NOTES.whoLineMaxChars);
  });
});

describe('formatBirthday', () => {
  it('shows day.month.year', () => {
    expect(formatBirthday('1985-03-07')).toBe('07.03.1985');
  });

  it('returns empty text for anything else', () => {
    expect(formatBirthday('')).toBe('');
    expect(formatBirthday('7 March')).toBe('');
  });
});

describe('elderVoiceNotes', () => {
  it('never returns a "caregiver only" voice message', () => {
    const voice = (id: string, visibility: MemoryNote['visibility']) => ({
      id,
      personId: 'p',
      audio: new ArrayBuffer(1),
      mimeType: 'audio/webm',
      durationMs: 1000,
      visibility,
      createdAt: 1,
    });
    expect(elderVoiceNotes([voice('a', 'caregiver'), voice('b', 'elder')]).map((n) => n.id)).toEqual(['b']);
  });
});
