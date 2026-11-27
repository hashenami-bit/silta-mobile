// Shared app state available to every screen through useApp(). Owned by the main session.

import { createContext, useContext } from 'react';
import type { TextKey, TextVars } from '../i18n';
import type { SiltaDb } from '../lib/db/api';
import type { Id, Lang, Person, SessionLogEntry, Settings } from '../lib/types';
import type { Route } from './navigation';

export type ToastKind = 'info' | 'success';

export interface ToastMessage {
  id: number;
  text: string;
  kind: ToastKind;
}

/**
 * open:  right PIN, the caregiver area is open now.
 * wrong: PIN did not match.
 * wait:  too many tries; no more until waitMs have passed.
 * again: the area was closed again while the PIN was being checked (e.g. "back" was pressed): ask again quietly.
 */
export type UnlockResult =
  | { kind: 'open' }
  | { kind: 'wrong' }
  | { kind: 'wait'; waitMs: number }
  | { kind: 'again' };

export interface AppContextValue {
  /** False until settings and people have been read from storage. */
  ready: boolean;
  /** True when saved data could not be read at start. */
  loadFailed: boolean;
  /** Current language (falls back to Uzbek until one is chosen). */
  lang: Lang;
  settings: Settings;
  people: Person[];

  /** Text in the current language. */
  t(key: TextKey, vars?: TextVars): string;

  /** The screen on top. */
  route: Route;
  /** Open a screen on top of the current one. */
  navigate(route: Route): void;
  /** Swap the current screen without adding a step to "back". */
  replace(route: Route): void;
  /** Go one screen back (same as the phone's back button). */
  back(): void;
  /** Go straight to the home screen. */
  goHome(): void;
  /**
   * While a guard is set, a "back" that would close the current screen calls the guard
   * instead (so the screen can ask "leave without saving?"). Pass null to remove it.
   */
  setBackGuard(guard: (() => void) | null): void;

  savePerson(person: Person): Promise<void>;
  deletePerson(id: Id): Promise<void>;
  updateSettings(patch: Partial<Settings>): Promise<void>;
  /** Deletes everything saved on this phone and returns to first start. */
  clearAllData(): Promise<void>;
  /** Adds one line to the session history (id is created for you). */
  logSession(entry: Omit<SessionLogEntry, 'id'>): Promise<void>;

  /** Direct storage access for voice notes and reading the session history. */
  db: SiltaDb;

  /** True after the caregiver entered the PIN. Goes back to false on any screen that is not for the caregiver. */
  unlocked: boolean;
  /** True while the PIN screen covers the current screen. Screens use it to switch off the camera. */
  screenCovered: boolean;
  /** Milliseconds until the next PIN try is allowed (0 = now). */
  pinWaitMs(): number;
  /** Checks the PIN and opens the caregiver area when it is right. */
  unlock(pin: string): Promise<UnlockResult>;
  /** Sets or changes the PIN. With a PIN already set, the caregiver area must be open. */
  setPin(pin: string): Promise<void>;
  /** Removes the PIN. The caregiver area must be open. */
  removePin(): Promise<void>;

  /** Short message shown by the toast host, or null. */
  toast: ToastMessage | null;
  notify(text: string, kind?: ToastKind): void;
  dismissToast(): void;
}

export const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp must be used inside <AppProvider>');
  return value;
}
