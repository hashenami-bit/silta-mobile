// Brings records saved by an older version of the app up to today's shape.
// Runs on every read, so nothing has to be rewritten in storage first.

import { NOTES } from '../config';
import type { Person, VoiceNote } from '../types';

type NewPersonFields = 'whoLine' | 'birthday' | 'phone' | 'city' | 'memoryNotes';

/** A person as it may sit in storage: new fields can be missing, the old free-text `notes` can be there. */
export type StoredPerson = Omit<Person, NewPersonFields> &
  Partial<Pick<Person, NewPersonFields>> & { notes?: string };

/** A voice note as it may sit in storage: `visibility` can be missing. */
export type StoredVoiceNote = Omit<VoiceNote, 'visibility'> & Partial<Pick<VoiceNote, 'visibility'>>;

export function upgradePerson(stored: StoredPerson): Person {
  const { notes, ...rest } = stored;
  const person: Person = {
    ...rest,
    whoLine: rest.whoLine ?? '',
    birthday: rest.birthday ?? '',
    phone: rest.phone ?? '',
    city: rest.city ?? '',
    memoryNotes: rest.memoryNotes ?? [],
  };
  const old = (notes ?? '').trim();
  if (!old) return person;
  // The old note was already shown on the recognition card, so it stays visible to the elder.
  if (!person.whoLine && old.length <= NOTES.whoLineMaxChars && !old.includes('\n')) {
    return { ...person, whoLine: old };
  }
  return {
    ...person,
    memoryNotes: [
      { id: `legacy-${person.id}`, text: old, visibility: 'elder', createdAt: person.createdAt },
      ...person.memoryNotes,
    ],
  };
}

export function upgradeVoiceNote(stored: StoredVoiceNote): VoiceNote {
  // Old voice notes were only ever played on the caregiver's screen: keep them there until the caregiver decides.
  return { ...stored, visibility: stored.visibility ?? 'caregiver' };
}
