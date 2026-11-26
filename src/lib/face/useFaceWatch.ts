import { useEffect, useRef, useState } from 'react';
import { FACE } from '../config';
import type { MatchResult } from '../types';
import type { FaceWatch, FaceWatchOptions } from './api';
import { getFaceEngine } from './engine';
import { createStableMatcher, matchFace } from './match';

function sameResult(a: MatchResult | null, b: MatchResult): boolean {
  if (!a || a.kind !== b.kind) return false;
  return a.kind !== 'match' || (b.kind === 'match' && a.personId === b.personId);
}

export function useFaceWatch({ video, people, enabled }: FaceWatchOptions): FaceWatch {
  const [result, setResult] = useState<MatchResult | null>(null);
  const [failed, setFailed] = useState(false);
  // One matcher for the life of the hook (it is plain state, not read from a ref).
  const [matcher] = useState(createStableMatcher);
  const peopleRef = useRef(people);

  useEffect(() => {
    peopleRef.current = people;
  });

  useEffect(() => {
    if (!enabled || failed) return;

    const engine = getFaceEngine();
    // A fresh start never inherits an old streak.
    matcher.reset();
    let cancelled = false;
    let busy = false;
    let failures = 0;

    const tick = async () => {
      const el = video.current;
      if (busy || !el || el.readyState < 2) return;
      busy = true;
      try {
        const found = await engine.describe(el);
        if (cancelled) return;
        failures = 0;
        const raw: MatchResult = found
          ? matchFace(found.descriptor, peopleRef.current)
          : { kind: 'none' };
        const next = matcher.push(raw);
        setResult((prev) => (sameResult(prev, next) ? prev : next));
      } catch {
        // One failed check (a GPU hiccup) is skipped and the next tick tries again. Many in a row
        // mean the engine is broken (e.g. the phone took the graphics memory away): say so
        // instead of showing "looking…" forever.
        failures += 1;
        if (failures >= FACE.maxFailedChecks && !cancelled) setFailed(true);
      } finally {
        busy = false;
      }
    };

    const id = setInterval(() => void tick(), FACE.checkIntervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
      // Pausing keeps the last result on screen; only reset() clears it.
      matcher.reset();
    };
  }, [enabled, failed, video, matcher]);

  const reset = () => {
    matcher.reset();
    setResult(null);
    setFailed(false);
  };

  return { result, failed, reset };
}
