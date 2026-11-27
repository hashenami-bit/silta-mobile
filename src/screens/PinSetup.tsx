import { useEffect, useRef, useState } from 'react';
import { useApp } from '../app/appContext';
import { Panel, PinPad, Screen, ScreenHeader } from '../components/ui';
import type { TextKey } from '../i18n';
import { LOCK } from '../lib/config';
import { PinNotice } from './PinNotice';
import type { PinNoticeKind } from './PinNotice';
import { usePinWait } from './usePinWait';

type Step = 'current' | 'new' | 'repeat';

const STEP_TEXT: Record<Step, TextKey> = {
  current: 'pin.step.current',
  new: 'pin.step.new',
  repeat: 'pin.step.repeat',
};

/**
 * Caregiver sets or changes the PIN. Changing asks for the current PIN first, so nobody who
 * finds the phone open can set a PIN the caregiver does not know. Then the new PIN twice.
 */
export function PinSetupScreen() {
  const { t, settings, unlock, setPin, back, notify } = useApp();
  // Decided once: the title must not flip when the new PIN is saved a moment before the screen closes.
  const [changing] = useState(() => settings.pinLock !== null);
  const [step, setStep] = useState<Step>(changing ? 'current' : 'new');
  const [first, setFirst] = useState('');
  const [pin, setPinValue] = useState('');
  const [notice, setNotice] = useState<PinNoticeKind>(null);
  const [busy, setBusy] = useState(false);
  const wait = usePinWait();
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  async function checkCurrent(value: string) {
    setBusy(true);
    try {
      const result = await unlock(value); // counts against the same wrong-PIN limit as the PIN screen
      if (!aliveRef.current) return;
      if (result.kind === 'open') setStep('new');
      else if (result.kind === 'wait') wait.start(result.waitMs);
      else if (result.kind === 'wrong') setNotice('wrong');
    } catch {
      if (aliveRef.current) setNotice('failed');
    } finally {
      if (aliveRef.current) setBusy(false);
    }
  }

  async function save(value: string) {
    setBusy(true);
    try {
      await setPin(value);
      // Left while saving (back pressed): the PIN is saved, but do not close a second screen.
      if (!aliveRef.current) return;
      notify(t('toast.pinSaved'), 'success');
      back();
    } catch {
      if (!aliveRef.current) return;
      setStep(changing ? 'current' : 'new');
      setNotice('failed');
      setBusy(false);
    }
  }

  function enter(next: string) {
    setPinValue(next);
    if (next.length < LOCK.pinLength || busy) return;
    setPinValue('');
    setNotice(null);
    if (step === 'current') {
      void checkCurrent(next);
    } else if (step === 'new') {
      setFirst(next);
      setStep('repeat');
    } else if (next !== first) {
      setFirst('');
      setStep('new');
      setNotice('mismatch');
    } else {
      void save(next);
    }
  }

  return (
    <Screen>
      <ScreenHeader title={t(changing ? 'pin.title.change' : 'pin.title.set')} onBack={back} />
      <main className="space-y-6 px-5 pb-8 pt-3">
        <Panel tone="river">
          <p>{t('pin.intro')}</p>
          <p className="mt-2 font-semibold">{t('pin.warning')}</p>
        </Panel>

        <p role="status" className="font-display text-lead text-ink">
          {t(STEP_TEXT[step], { count: LOCK.pinLength })}
        </p>

        <PinPad value={pin} onChange={enter} length={LOCK.pinLength} disabled={busy || wait.waiting} />

        <PinNotice kind={notice} waitSeconds={wait.waiting ? wait.seconds : 0} />
      </main>
    </Screen>
  );
}
