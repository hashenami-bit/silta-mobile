// Storage contract. Owned by the main session.
// src/lib/db/index.ts must export:  export function getDb(): SiltaDb
// (one shared instance; opens IndexedDB on first use).

import type { Id, Person, SessionLogEntry, Settings, VoiceNote } from '../types';

export const DEFAULT_SETTINGS: Settings = {
  lang: null,
  browseOnly: false,
  voiceEnabled: false,
  defaultStarter: 'caregiver',
  pinLock: null,
};

export interface SiltaDb {
  /** All people, oldest first. */
  listPeople(): Promise<Person[]>;
  getPerson(id: Id): Promise<Person | undefined>;
  /** Insert or replace by id. */
  savePerson(person: Person): Promise<void>;
  /** Removes the person and all of their voice notes. */
  deletePerson(id: Id): Promise<void>;

  /** Returns DEFAULT_SETTINGS when nothing is saved yet. */
  getSettings(): Promise<Settings>;
  saveSettings(settings: Settings): Promise<void>;

  addSessionLog(entry: SessionLogEntry): Promise<void>;
  /** Entries with startedAt >= sinceMs (all when omitted), newest first. */
  listSessionLog(sinceMs?: number): Promise<SessionLogEntry[]>;

  /** Notes for one person, newest first. */
  listVoiceNotes(personId: Id): Promise<VoiceNote[]>;
  /** Insert or replace by id (also used to change who may hear a note). */
  addVoiceNote(note: VoiceNote): Promise<void>;
  deleteVoiceNote(id: Id): Promise<void>;

  /** Deletes people, voice notes, session log and settings. */
  clearAll(): Promise<void>;
}
