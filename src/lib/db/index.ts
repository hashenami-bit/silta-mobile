// IndexedDB storage for Silta. Implements the SiltaDb contract from ./api.ts.

import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';
import { DEFAULT_SETTINGS } from './api';
import type { SiltaDb } from './api';
import type { Id, Person, SessionLogEntry, Settings, VoiceNote } from '../types';

export { DEFAULT_SETTINGS };
export type { SiltaDb };

const DB_NAME = 'silta';
const DB_VERSION = 1;
const SETTINGS_KEY = 'main';

interface SiltaSchema extends DBSchema {
  people: { key: Id; value: Person };
  settings: { key: string; value: Settings };
  sessionLog: {
    key: Id;
    value: SessionLogEntry;
    indexes: { startedAt: number };
  };
  voiceNotes: {
    key: Id;
    value: VoiceNote;
    indexes: { personId: Id };
  };
}

type Db = IDBPDatabase<SiltaSchema>;

/** Each `if (oldVersion < N)` block runs once. Add new blocks for later versions. */
function upgrade(db: Db, oldVersion: number): void {
  if (oldVersion < 1) {
    db.createObjectStore('people', { keyPath: 'id' });
    db.createObjectStore('settings');
    db.createObjectStore('sessionLog', { keyPath: 'id' }).createIndex('startedAt', 'startedAt');
    db.createObjectStore('voiceNotes', { keyPath: 'id' }).createIndex('personId', 'personId');
  }
}

function requestPersistentStorage(): void {
  try {
    if (typeof navigator === 'undefined') return;
    const result = navigator.storage?.persist?.();
    if (result && typeof result.catch === 'function') result.catch(() => undefined);
  } catch {
    // best effort only
  }
}

/** True for the errors a browser gives when the storage connection was closed behind our back. */
function isLostConnection(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const { name, message } = err as { name?: unknown; message?: unknown };
  if (name === 'InvalidStateError' || name === 'UnknownError') return true;
  return typeof message === 'string' && /connection.*(lost|clos)/i.test(message);
}

export function createDb(name: string): SiltaDb {
  let opened: Promise<Db> | null = null;

  const open = (): Promise<Db> => {
    if (!opened) {
      const attempt = openDB<SiltaSchema>(name, DB_VERSION, {
        upgrade,
        // The browser closed the connection by itself: open a new one next time.
        terminated() {
          if (opened === attempt) opened = null;
        },
      });
      opened = attempt;
      attempt.then(requestPersistentStorage, () => {
        if (opened === attempt) opened = null; // allow a retry after a failed open
      });
    }
    return opened;
  };

  /**
   * Runs one piece of storage work. iPhone sometimes drops the storage connection after the
   * app has been in the background; then we open a fresh connection and try once more.
   */
  const run = async <T>(work: (db: Db) => Promise<T>): Promise<T> => {
    const attempt = open();
    try {
      return await work(await attempt);
    } catch (err) {
      if (!isLostConnection(err)) throw err;
      if (opened === attempt) opened = null;
      // Let go of the dead connection so it can never block a later upgrade.
      attempt.then((db) => db.close()).catch(() => undefined);
      return work(await open());
    }
  };

  return {
    listPeople() {
      return run(async (db) => {
        const people = await db.getAll('people');
        return people.sort((a, b) => a.createdAt - b.createdAt);
      });
    },

    getPerson(id) {
      return run(async (db) => {
        return db.get('people', id);
      });
    },

    savePerson(person) {
      return run(async (db) => {
        await db.put('people', person);
      });
    },

    deletePerson(id) {
      return run(async (db) => {
        const tx = db.transaction(['people', 'voiceNotes', 'sessionLog'], 'readwrite');
        const noteKeys = await tx.objectStore('voiceNotes').index('personId').getAllKeys(id);
        // Keep the session counts, but forget which person was named.
        const logStore = tx.objectStore('sessionLog');
        const named = (await logStore.getAll()).filter((entry) => entry.personId === id);
        await Promise.all([
          tx.objectStore('people').delete(id),
          ...noteKeys.map((key) => tx.objectStore('voiceNotes').delete(key)),
          ...named.map((entry) => logStore.put({ ...entry, personId: null })),
          tx.done,
        ]);
      });
    },

    getSettings() {
      return run(async (db) => {
        const saved = await db.get('settings', SETTINGS_KEY);
        return { ...DEFAULT_SETTINGS, ...saved };
      });
    },

    saveSettings(settings) {
      return run(async (db) => {
        await db.put('settings', settings, SETTINGS_KEY);
      });
    },

    addSessionLog(entry) {
      return run(async (db) => {
        await db.put('sessionLog', entry);
      });
    },

    listSessionLog(sinceMs) {
      return run(async (db) => {
        const entries =
          sinceMs === undefined
            ? await db.getAllFromIndex('sessionLog', 'startedAt')
            : await db.getAllFromIndex('sessionLog', 'startedAt', IDBKeyRange.lowerBound(sinceMs));
        return entries.reverse();
      });
    },

    listVoiceNotes(personId) {
      return run(async (db) => {
        const notes = await db.getAllFromIndex('voiceNotes', 'personId', personId);
        return notes.sort((a, b) => b.createdAt - a.createdAt);
      });
    },

    addVoiceNote(note) {
      return run(async (db) => {
        await db.put('voiceNotes', note);
      });
    },

    deleteVoiceNote(id) {
      return run(async (db) => {
        await db.delete('voiceNotes', id);
      });
    },

    clearAll() {
      return run(async (db) => {
        const tx = db.transaction(['people', 'settings', 'sessionLog', 'voiceNotes'], 'readwrite');
        await Promise.all([
          tx.objectStore('people').clear(),
          tx.objectStore('settings').clear(),
          tx.objectStore('sessionLog').clear(),
          tx.objectStore('voiceNotes').clear(),
          tx.done,
        ]);
      });
    },
  };
}

let shared: SiltaDb | null = null;

/** One shared instance. IndexedDB is opened on first use. */
export function getDb(): SiltaDb {
  shared ??= createDb(DB_NAME);
  return shared;
}
