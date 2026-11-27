// Loads saved data and provides shared state + navigation. Owned by the main session.

import { App as NativeApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { DEFAULT_LANG, translate } from '../i18n';
import type { TextKey, TextVars } from '../i18n';
import { DEFAULT_SETTINGS } from '../lib/db/api';
import type { SiltaDb } from '../lib/db/api';
import { LOCK } from '../lib/config';
import { newId } from '../lib/id';
import { checkPin, createPinLock, createTryGate } from '../lib/lock';
import type { Id, Person, SessionLogEntry, Settings } from '../lib/types';
import { AppContext } from './appContext';
import type { AppContextValue, ToastKind, ToastMessage, UnlockResult } from './appContext';
import { HOME, isCaregiverRoute } from './navigation';
import type { Route } from './navigation';

const TOAST_MS = 4000;

// Counts wrong PINs for as long as the app stays open, whichever screen asks.
const pinGate = createTryGate();

interface AppProviderProps {
  db: SiltaDb;
  children: ReactNode;
}

function depthOf(state: unknown): number {
  if (state && typeof state === 'object' && 'depth' in state) {
    const depth = (state as { depth: unknown }).depth;
    if (typeof depth === 'number') return depth;
  }
  return 0;
}

export function AppProvider({ db, children }: AppProviderProps) {
  const [ready, setReady] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [settings, setSettingsState] = useState<Settings>(DEFAULT_SETTINGS);
  const [people, setPeople] = useState<Person[]>([]);
  const [stack, setStackState] = useState<Route[]>([HOME]);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [unlocked, setUnlockedState] = useState(false);

  // Mirrors of state for event handlers, so quick taps never work from an old copy.
  const stackRef = useRef<Route[]>([HOME]);
  const settingsRef = useRef<Settings>(DEFAULT_SETTINGS);
  const backGuard = useRef<(() => void) | null>(null);
  const unlockedRef = useRef(false);
  const checkingPin = useRef(false);
  // Grows on every re-lock, so a PIN check that finishes after a re-lock cannot open the area again.
  const lockGen = useRef(0);
  // Settings are written one at a time, each from the newest copy, so no change overwrites another.
  const settingsWrites = useRef<Promise<unknown>>(Promise.resolve());
  const toastTimer = useRef<number | undefined>(undefined);
  const toastId = useRef(0);

  function setStack(next: Route[]) {
    stackRef.current = next;
    setStackState(next);
  }

  function setUnlocked(next: boolean) {
    unlockedRef.current = next;
    setUnlockedState(next);
  }

  function lockArea() {
    lockGen.current += 1;
    setUnlocked(false);
  }

  /** Saves the newest settings with `patch` on top, after any earlier write has finished. */
  function writeSettings(patch: Partial<Settings>): Promise<void> {
    const run = settingsWrites.current
      .catch(() => undefined)
      .then(() => db.saveSettings({ ...settingsRef.current, ...patch }));
    settingsWrites.current = run;
    return run;
  }

  function setSettings(next: Settings) {
    settingsRef.current = next;
    setSettingsState(next);
  }

  // Read saved data once.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [savedSettings, savedPeople] = await Promise.all([db.getSettings(), db.listPeople()]);
        if (cancelled) return;
        settingsRef.current = savedSettings;
        setSettingsState(savedSettings);
        setPeople(savedPeople);
        setReady(true);
      } catch {
        if (!cancelled) setLoadFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [db]);

  // Keep the screen stack in step with the back button (browser history).
  useEffect(() => {
    // After a page reload the browser may still be several history steps deep: return to the first one.
    const startDepth = depthOf(window.history.state);
    if (startDepth > 0) window.history.go(-startDepth);
    else window.history.replaceState({ depth: 0 }, '');

    const onPop = (event: PopStateEvent) => {
      const depth = depthOf(event.state);
      const current = stackRef.current;
      if (depth + 1 >= current.length) return;
      const gated =
        settingsRef.current.pinLock !== null && !unlockedRef.current && isCaregiverRoute(current[current.length - 1]);
      // Behind the PIN screen the form's "leave without saving?" question could not be seen: just leave.
      if (backGuard.current && depth + 2 === current.length && !gated) {
        // A screen asked to confirm before closing: stay on it and let it ask.
        window.history.pushState({ depth: depth + 1 }, '');
        backGuard.current();
        return;
      }
      const next = current.slice(0, depth + 1);
      stackRef.current = next;
      setStackState(next);
      // Back on a screen that is not for the caregiver (e.g. home): the caregiver area closes again.
      if (!isCaregiverRoute(next[next.length - 1])) {
        lockGen.current += 1;
        unlockedRef.current = false;
        setUnlockedState(false);
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Android hardware back button: go one screen back, or leave the app from the home screen.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const listener = NativeApp.addListener('backButton', () => {
      if (stackRef.current.length > 1) window.history.back();
      else void NativeApp.minimizeApp();
    });
    return () => {
      void listener.then((handle) => handle.remove());
    };
  }, []);

  // The phone was put away for a while with the caregiver area open: close it.
  // The page event and the phone app's own event both report this; whichever comes first counts.
  useEffect(() => {
    let hiddenAt: number | null = null;
    const onHidden = () => {
      hiddenAt ??= Date.now();
    };
    const onShown = () => {
      if (hiddenAt !== null && Date.now() - hiddenAt >= LOCK.backgroundMs) {
        lockGen.current += 1;
        unlockedRef.current = false;
        setUnlockedState(false);
      }
      hiddenAt = null;
    };
    const onVisibility = () => (document.visibilityState === 'hidden' ? onHidden() : onShown());
    document.addEventListener('visibilitychange', onVisibility);
    const native = Capacitor.isNativePlatform()
      ? NativeApp.addListener('appStateChange', ({ isActive }) => (isActive ? onShown() : onHidden()))
      : null;
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      void native?.then((handle) => handle.remove());
    };
  }, []);

  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const lang = settings.lang ?? DEFAULT_LANG;

  function goToFirstScreen() {
    const steps = stackRef.current.length - 1;
    if (steps > 0) window.history.go(-steps);
  }

  const value: AppContextValue = {
    ready,
    loadFailed,
    lang,
    settings,
    people,
    db,

    t: (key: TextKey, vars?: TextVars) => translate(lang, key, vars),

    route: stack[stack.length - 1],
    navigate: (route: Route) => {
      if (!isCaregiverRoute(route)) lockArea();
      const current = stackRef.current;
      window.history.pushState({ depth: current.length }, '');
      setStack([...current, route]);
    },
    replace: (route: Route) => {
      if (!isCaregiverRoute(route)) lockArea();
      setStack([...stackRef.current.slice(0, -1), route]);
    },
    back: () => {
      if (stackRef.current.length > 1) window.history.back();
    },
    goHome: goToFirstScreen,
    setBackGuard: (guard: (() => void) | null) => {
      backGuard.current = guard;
    },

    savePerson: async (person: Person) => {
      await db.savePerson(person);
      setPeople(await db.listPeople());
    },
    deletePerson: async (id: Id) => {
      await db.deletePerson(id);
      setPeople(await db.listPeople());
    },
    updateSettings: async (patch: Partial<Settings>) => {
      setSettings({ ...settingsRef.current, ...patch });
      await writeSettings(patch);
    },
    clearAllData: async () => {
      await db.clearAll();
      setSettings(DEFAULT_SETTINGS);
      lockArea();
      setPeople([]);
      backGuard.current = null;
      goToFirstScreen();
    },
    logSession: async (entry: Omit<SessionLogEntry, 'id'>) => {
      await db.addSessionLog({ ...entry, id: newId() });
    },

    unlocked,
    screenCovered: settings.pinLock !== null && !unlocked && isCaregiverRoute(stack[stack.length - 1]),
    pinWaitMs: () => pinGate.waitMs(Date.now()),
    unlock: async (pin: string): Promise<UnlockResult> => {
      const lock = settingsRef.current.pinLock;
      if (!lock) {
        setUnlocked(true);
        return { kind: 'open' };
      }
      const waitMs = pinGate.waitMs(Date.now());
      if (waitMs > 0) return { kind: 'wait', waitMs };
      // One check at a time, so quick taps cannot slip extra guesses past the counter.
      if (checkingPin.current) return { kind: 'again' };
      checkingPin.current = true;
      const gen = lockGen.current;
      try {
        if (await checkPin(pin, lock)) {
          pinGate.hit();
          const top = stackRef.current[stackRef.current.length - 1];
          // Closed again while checking (back pressed, app put away): do not open behind the person's back.
          if (gen !== lockGen.current || !isCaregiverRoute(top)) return { kind: 'again' };
          setUnlocked(true);
          return { kind: 'open' };
        }
        pinGate.miss(Date.now());
        const wait = pinGate.waitMs(Date.now());
        return wait > 0 ? { kind: 'wait', waitMs: wait } : { kind: 'wrong' };
      } finally {
        checkingPin.current = false;
      }
    },
    setPin: async (pin: string) => {
      if (settingsRef.current.pinLock && !unlockedRef.current) throw new Error('locked');
      const gen = lockGen.current;
      const pinLock = await createPinLock(pin);
      await writeSettings({ pinLock });
      setSettings({ ...settingsRef.current, pinLock });
      // Saving takes a moment. If the area was closed meanwhile (back pressed to Home, app put away),
      // keep it closed: the new PIN is saved, but it must not open the area behind the person's back.
      const top = stackRef.current[stackRef.current.length - 1];
      if (gen === lockGen.current && isCaregiverRoute(top)) setUnlocked(true);
    },
    removePin: async () => {
      if (settingsRef.current.pinLock && !unlockedRef.current) throw new Error('locked');
      await writeSettings({ pinLock: null });
      setSettings({ ...settingsRef.current, pinLock: null });
    },

    toast,
    notify: (text: string, kind: ToastKind = 'info') => {
      window.clearTimeout(toastTimer.current);
      toastId.current += 1;
      setToast({ id: toastId.current, text, kind });
      toastTimer.current = window.setTimeout(() => setToast(null), TOAST_MS);
    },
    dismissToast: () => {
      window.clearTimeout(toastTimer.current);
      setToast(null);
    },
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
