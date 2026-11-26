// Loads saved data and provides shared state + navigation. Owned by the main session.

import { App as NativeApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { DEFAULT_LANG, translate } from '../i18n';
import type { TextKey, TextVars } from '../i18n';
import { DEFAULT_SETTINGS } from '../lib/db/api';
import type { SiltaDb } from '../lib/db/api';
import { newId } from '../lib/id';
import type { Id, Person, SessionLogEntry, Settings } from '../lib/types';
import { AppContext } from './appContext';
import type { AppContextValue, ToastKind, ToastMessage } from './appContext';
import { HOME } from './navigation';
import type { Route } from './navigation';

const TOAST_MS = 4000;

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

  // Mirrors of state for event handlers, so quick taps never work from an old copy.
  const stackRef = useRef<Route[]>([HOME]);
  const settingsRef = useRef<Settings>(DEFAULT_SETTINGS);
  const backGuard = useRef<(() => void) | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);
  const toastId = useRef(0);

  function setStack(next: Route[]) {
    stackRef.current = next;
    setStackState(next);
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
      if (backGuard.current && depth + 2 === current.length) {
        // A screen asked to confirm before closing: stay on it and let it ask.
        window.history.pushState({ depth: depth + 1 }, '');
        backGuard.current();
        return;
      }
      const next = current.slice(0, depth + 1);
      stackRef.current = next;
      setStackState(next);
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
      const current = stackRef.current;
      window.history.pushState({ depth: current.length }, '');
      setStack([...current, route]);
    },
    replace: (route: Route) => {
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
      const next = { ...settingsRef.current, ...patch };
      setSettings(next);
      await db.saveSettings(next);
    },
    clearAllData: async () => {
      await db.clearAll();
      setSettings(DEFAULT_SETTINGS);
      setPeople([]);
      backGuard.current = null;
      goToFirstScreen();
    },
    logSession: async (entry: Omit<SessionLogEntry, 'id'>) => {
      await db.addSessionLog({ ...entry, id: newId() });
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
