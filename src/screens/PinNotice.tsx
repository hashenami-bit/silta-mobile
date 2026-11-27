import { useApp } from '../app/appContext';
import { Panel } from '../components/ui';

export type PinNoticeKind = 'wrong' | 'mismatch' | 'failed' | null;

/**
 * The one calm message under the keypad. Screen readers hear each message once:
 * the countdown number is hidden from them so it is not read out every second.
 */
export function PinNotice({ kind, waitSeconds }: { kind: PinNoticeKind; waitSeconds: number }) {
  const { t } = useApp();
  return (
    <div aria-live="polite" className="min-h-tap">
      {waitSeconds > 0 ? (
        <Panel tone="lantern">
          <span aria-hidden="true">{t('lock.wait', { seconds: waitSeconds })}</span>
          <span className="sr-only">{t('lock.waitShort')}</span>
        </Panel>
      ) : kind === 'wrong' ? (
        <Panel tone="lantern">{t('lock.wrong')}</Panel>
      ) : kind === 'mismatch' ? (
        <Panel tone="lantern">{t('pin.mismatch')}</Panel>
      ) : kind === 'failed' ? (
        <Panel tone="lantern">{t('error.generic')}</Panel>
      ) : null}
    </div>
  );
}
