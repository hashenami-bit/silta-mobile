import { useEffect, useRef, useState } from 'react';
import { useApp } from '../app/appContext';
import { Panel, PinPad, Screen, ScreenHeader, TextButton } from '../components/ui';
import { LOCK } from '../lib/config';
import { PinNotice } from './PinNotice';
import type { PinNoticeKind } from './PinNotice';
import { usePinWait } from './usePinWait';

/** Shown in place of a caregiver screen until the PIN is entered. */
export function UnlockScreen() {
  const { t, unlock, goHome } = useApp();
  const [pin, setPin] = useState('');
  const [checking, setChecking] = useState(false);
  const [notice, setNotice] = useState<PinNoticeKind>(null);
  const [showForgot, setShowForgot] = useState(false);
  const wait = usePinWait();
  const aliveRef = useRef(true);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    aliveRef.current = true;
    // The screen underneath can no longer hold focus: start keyboard and screen-reader users here.
    mainRef.current?.focus();
    return () => {
      aliveRef.current = false;
    };
  }, []);

  async function enter(next: string) {
    setPin(next);
    if (next.length < LOCK.pinLength || checking) return;
    setChecking(true);
    setNotice(null);
    try {
      const result = await unlock(next);
      if (!aliveRef.current || result.kind === 'open') return; // this screen is replaced by the one asked for
      setPin('');
      if (result.kind === 'wait') wait.start(result.waitMs);
      else if (result.kind === 'wrong') setNotice('wrong');
    } catch {
      if (!aliveRef.current) return;
      setPin('');
      setNotice('failed');
    } finally {
      if (aliveRef.current) setChecking(false);
    }
  }

  return (
    // Scrolls by itself: a dialog left open underneath may have stopped the page from scrolling.
    <Screen className="fixed inset-0 z-40 overflow-y-auto">
      <ScreenHeader title={t('lock.title')} onBack={goHome} />
      <main ref={mainRef} tabIndex={-1} className="space-y-6 px-5 pb-8 pt-3 outline-none">
        <p className="text-body text-ink">{t('lock.body', { count: LOCK.pinLength })}</p>

        <PinPad
          value={pin}
          onChange={(next) => void enter(next)}
          length={LOCK.pinLength}
          disabled={checking || wait.waiting}
        />

        <PinNotice kind={notice} waitSeconds={wait.waiting ? wait.seconds : 0} />

        <div className="text-center">
          <TextButton aria-expanded={showForgot} onClick={() => setShowForgot((v) => !v)}>
            {t('lock.forgot')}
          </TextButton>
        </div>
        {showForgot ? <Panel tone="river">{t('lock.forgot.body')}</Panel> : null}
      </main>
    </Screen>
  );
}
