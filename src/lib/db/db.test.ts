import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { createDb, DEFAULT_SETTINGS } from './index';
import { upgradePerson, upgradeVoiceNote } from './migrate';
import type { StoredPerson } from './migrate';
import type { Person, SessionLogEntry, VoiceNote } from '../types';

let counter = 0;
const freshDb = () => createDb(`silta-test-${++counter}-${Math.random()}`);

function makePerson(id: string, createdAt: number, extra: Partial<Person> = {}): Person {
  return {
    id,
    name: `Name ${id}`,
    kinship: { preset: 'daughter', custom: '' },
    whoLine: '',
    birthday: '',
    phone: '',
    city: '',
    memoryNotes: [],
    photos: [
      {
        id: `${id}-p1`,
        dataUrl: 'data:image/jpeg;base64,AAAA',
        descriptor: new Float32Array([0.5, -1.25, 3.75]),
        createdAt,
      },
    ],
    voiceSamples: [{ id: `${id}-v1`, vector: new Float32Array([1.5, 2.5]), createdAt }],
    consent: { caregiverName: 'Care', personAgreed: true, agreedAt: createdAt },
    createdAt,
    updatedAt: createdAt,
    ...extra,
  };
}

function makeNote(id: string, personId: string, createdAt: number, bytes: number[]): VoiceNote {
  return {
    id,
    personId,
    audio: new Uint8Array(bytes).buffer,
    mimeType: 'audio/webm',
    durationMs: 1000,
    visibility: 'elder',
    createdAt,
  };
}

function makeLog(id: string, startedAt: number): SessionLogEntry {
  return {
    id,
    type: 'album',
    startedBy: 'caregiver',
    startedAt,
    endedAt: startedAt + 10,
    outcome: 'completed',
    personId: null,
    cards: 3,
    correctFirstTry: 2,
  };
}

describe('people', () => {
  it('saves, lists and gets a person with typed arrays intact', async () => {
    const db = freshDb();
    const person = makePerson('a', 100);
    await db.savePerson(person);

    const list = await db.listPeople();
    expect(list).toHaveLength(1);
    const got = await db.getPerson('a');
    expect(got).toEqual(person);
    expect(got?.photos[0].descriptor).toBeInstanceOf(Float32Array);
    expect(Array.from(got!.photos[0].descriptor)).toEqual([0.5, -1.25, 3.75]);
    expect(got?.voiceSamples[0].vector).toBeInstanceOf(Float32Array);
    expect(Array.from(got!.voiceSamples[0].vector)).toEqual([1.5, 2.5]);
  });

  it('returns undefined for an unknown id', async () => {
    expect(await freshDb().getPerson('nope')).toBeUndefined();
  });

  it('replaces a person with the same id', async () => {
    const db = freshDb();
    await db.savePerson(makePerson('a', 100));
    await db.savePerson(makePerson('a', 100, { name: 'New name' }));
    const list = await db.listPeople();
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('New name');
  });

  it('lists oldest first', async () => {
    const db = freshDb();
    await db.savePerson(makePerson('c', 300));
    await db.savePerson(makePerson('a', 100));
    await db.savePerson(makePerson('b', 200));
    expect((await db.listPeople()).map((p) => p.id)).toEqual(['a', 'b', 'c']);
  });

  it('deletePerson removes that person and their voice notes only', async () => {
    const db = freshDb();
    await db.savePerson(
      makePerson('a', 100, {
        phone: '+998 90 000 00 00',
        memoryNotes: [{ id: 'm1', text: 'private', visibility: 'caregiver', createdAt: 1 }],
      }),
    );
    await db.savePerson(makePerson('b', 200));
    await db.addVoiceNote(makeNote('n1', 'a', 1, [1]));
    await db.addVoiceNote(makeNote('n2', 'a', 2, [2]));
    await db.addVoiceNote(makeNote('n3', 'b', 3, [3]));

    await db.deletePerson('a');

    expect(await db.getPerson('a')).toBeUndefined();
    expect(await db.listVoiceNotes('a')).toEqual([]);
    expect((await db.listPeople()).map((p) => p.id)).toEqual(['b']);
    expect((await db.listVoiceNotes('b')).map((n) => n.id)).toEqual(['n3']);
  });

  it('deletePerson on an unknown id does not fail', async () => {
    await expect(freshDb().deletePerson('nope')).resolves.toBeUndefined();
  });
});

describe('settings', () => {
  it('returns defaults (as a copy) when nothing is saved', async () => {
    const db = freshDb();
    const s = await db.getSettings();
    expect(s).toEqual(DEFAULT_SETTINGS);
    expect(s).not.toBe(DEFAULT_SETTINGS);
    s.browseOnly = true;
    expect(DEFAULT_SETTINGS.browseOnly).toBe(false);
  });

  it('saves and reads settings', async () => {
    const db = freshDb();
    await db.saveSettings({ lang: 'ru', browseOnly: true, voiceEnabled: true, defaultStarter: 'elder', pinLock: null });
    expect(await db.getSettings()).toEqual({ lang: 'ru', browseOnly: true, voiceEnabled: true, defaultStarter: 'elder', pinLock: null });
  });

  it('fills missing fields from defaults for partial saved records', async () => {
    const name = `silta-partial-${Math.random()}`;
    const db = createDb(name);
    await db.saveSettings({ lang: 'uz' } as never);
    expect(await db.getSettings()).toEqual({ ...DEFAULT_SETTINGS, lang: 'uz' });
  });
});

describe('session log', () => {
  it('lists newest first and filters by sinceMs (inclusive)', async () => {
    const db = freshDb();
    await db.addSessionLog(makeLog('x', 200));
    await db.addSessionLog(makeLog('y', 100));
    await db.addSessionLog(makeLog('z', 300));

    expect((await db.listSessionLog()).map((e) => e.id)).toEqual(['z', 'x', 'y']);
    expect((await db.listSessionLog(200)).map((e) => e.id)).toEqual(['z', 'x']);
    expect(await db.listSessionLog(301)).toEqual([]);
  });
});

describe('voice notes', () => {
  it('lists newest first with audio bytes intact', async () => {
    const db = freshDb();
    await db.addVoiceNote(makeNote('old', 'p', 10, [1, 2, 3]));
    await db.addVoiceNote(makeNote('new', 'p', 20, [9, 8, 7, 6]));
    await db.addVoiceNote(makeNote('other', 'q', 30, [5]));

    const notes = await db.listVoiceNotes('p');
    expect(notes.map((n) => n.id)).toEqual(['new', 'old']);
    expect(notes[0].audio).toBeInstanceOf(ArrayBuffer);
    expect(Array.from(new Uint8Array(notes[0].audio))).toEqual([9, 8, 7, 6]);
    expect(Array.from(new Uint8Array(notes[1].audio))).toEqual([1, 2, 3]);
  });

  it('deleteVoiceNote removes one note', async () => {
    const db = freshDb();
    await db.addVoiceNote(makeNote('n1', 'p', 1, [1]));
    await db.addVoiceNote(makeNote('n2', 'p', 2, [2]));
    await db.deleteVoiceNote('n1');
    expect((await db.listVoiceNotes('p')).map((n) => n.id)).toEqual(['n2']);
  });
});

describe('clearAll', () => {
  it('empties every store', async () => {
    const db = freshDb();
    await db.savePerson(makePerson('a', 1));
    await db.addVoiceNote(makeNote('n', 'a', 1, [1]));
    await db.addSessionLog(makeLog('l', 1));
    await db.saveSettings({ lang: 'ru', browseOnly: true, voiceEnabled: true, defaultStarter: 'elder', pinLock: null });

    await db.clearAll();

    expect(await db.listPeople()).toEqual([]);
    expect(await db.listVoiceNotes('a')).toEqual([]);
    expect(await db.listSessionLog()).toEqual([]);
    expect(await db.getSettings()).toEqual(DEFAULT_SETTINGS);
  });
  it('deletePerson forgets that person in the session history but keeps the entries', async () => {
    const db = freshDb();
    await db.savePerson(makePerson('a', 1));
    await db.addSessionLog({ ...makeLog('l1', 1), personId: 'a' });
    await db.addSessionLog({ ...makeLog('l2', 2), personId: 'b' });

    await db.deletePerson('a');

    const log = await db.listSessionLog();
    expect(log).toHaveLength(2);
    expect(log.find((e) => e.id === 'l1')?.personId).toBeNull();
    expect(log.find((e) => e.id === 'l2')?.personId).toBe('b');
  });
});

describe('records saved by an older version', () => {
  function oldPerson(notes: string): StoredPerson {
    const { whoLine, birthday, phone, city, memoryNotes, ...rest } = makePerson('old', 5);
    void [whoLine, birthday, phone, city, memoryNotes];
    return { ...rest, notes };
  }

  it('fills the new fields with empty values', () => {
    const p = upgradePerson(oldPerson(''));
    expect(p).toMatchObject({ whoLine: '', birthday: '', phone: '', city: '', memoryNotes: [] });
    expect('notes' in p).toBe(false);
  });

  it('turns a short old note into the who-line', () => {
    const p = upgradePerson(oldPerson('  Har yakshanba sizni ko\'rgani keladi.  '));
    expect(p.whoLine).toBe("Har yakshanba sizni ko'rgani keladi.");
    expect(p.memoryNotes).toEqual([]);
  });

  it('turns a long old note into a memory the elder can still see', () => {
    const long = 'a'.repeat(120);
    const p = upgradePerson(oldPerson(long));
    expect(p.whoLine).toBe('');
    expect(p.memoryNotes).toEqual([{ id: 'legacy-old', text: long, visibility: 'elder', createdAt: 5 }]);
  });

  it('leaves an up-to-date person unchanged', () => {
    const now = makePerson('new', 7, { whoLine: 'Qo\'shningiz', city: 'Toshkent' });
    expect(upgradePerson(now)).toEqual(now);
  });

  it('reads an old person from storage in the new shape', async () => {
    const db = freshDb();
    // An older app version wrote this record; the cast stands in for that version.
    await db.savePerson(oldPerson('Qisqa eslatma') as unknown as Person);
    const [listed] = await db.listPeople();
    expect(listed.whoLine).toBe('Qisqa eslatma');
    expect((await db.getPerson('old'))?.memoryNotes).toEqual([]);
  });

  it('keeps an old voice note for the caregiver only', async () => {
    const { visibility, ...old } = makeNote('n', 'p', 1, [1]);
    void visibility;
    expect(upgradeVoiceNote(old).visibility).toBe('caregiver');
    const db = freshDb();
    await db.addVoiceNote(old as unknown as VoiceNote);
    expect((await db.listVoiceNotes('p'))[0].visibility).toBe('caregiver');
  });

  it('addVoiceNote with the same id changes who may hear it', async () => {
    const db = freshDb();
    const note = makeNote('n', 'p', 1, [1]);
    await db.addVoiceNote(note);
    await db.addVoiceNote({ ...note, visibility: 'caregiver' });
    const notes = await db.listVoiceNotes('p');
    expect(notes).toHaveLength(1);
    expect(notes[0].visibility).toBe('caregiver');
  });
});
