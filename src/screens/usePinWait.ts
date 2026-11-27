import { useEffect, useEffectEvent, useState } from 'react';
import { useApp } from '../app/appContext';

export interface PinWait {
  waiting: boolean;
  /** Whole seconds left, for the countdown. */
  seconds: number;
  /** Call with the waitMs an unlock() result gave. */
  start(waitMs: number): void;
}

/** The wait after too many wrong PINs. Already running when the screen opens, if a wait is still on. */
export function usePinWait(): PinWait {
  const { pinWaitMs } = useApp();
  const [left, setLeft] = useState(() => pinWaitMs());
  const waiting = left > 0;
  const refresh = useEffectEvent(() => setLeft(pinWaitMs()));

  useEffect(() => {
    if (!waiting) return;
    const timer = window.setInterval(refresh, 500);
    return () => window.clearInterval(timer);
  }, [waiting]);

  return { waiting, seconds: Math.ceil(left / 1000), start: setLeft };
}
