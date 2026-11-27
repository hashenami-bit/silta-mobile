import { CircleHelp, KeyRound, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useApp } from '../app/appContext';
import { BottomBar, Card, ChoiceTile, ConfirmDialog, DangerButton, Panel, Screen, SecondaryButton, Switch } from '../components/ui';
import type { TextKey } from '../i18n';
import { APP_VERSION } from '../lib/config';
import { getFaceEngineInfo } from '../lib/face';
import type { Lang, SessionLogEntry, SessionStarter } from '../lib/types';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const LANGS: Array<{ lang: Lang; label: TextKey }> = [
  { lang: 'uz', label: 'start.uz' },
  { lang: 'ru', label: 'start.ru' },
];

const STARTERS: Array<{ value: SessionStarter; label: TextKey }> = [
  { value: 'caregiver', label: 'settings.starter.caregiver' },
  { value: 'elder', label: 'settings.starter.elder' },
  { value: 'relative', label: 'settings.starter.relative' },
];

type History = { status: 'loading' } | { status: 'error' } | { status: 'ready'; entries: SessionLogEntry[] };

export function SettingsScreen() {
  const { t, lang, settings, updateSettings, clearAllData, removePin, notify, navigate, db } = useApp();
  const [history, setHistory] = useState<History>({ status: 'loading' });
  const [confirming, setConfirming] = useState(false);
  const [confirmingPin, setConfirmingPin] = useState(false);
  const [failed, setFailed] = useState(false);
  const engineInfo = getFaceEngineInfo();

  useEffect(() => {
    let cancelled = false;
    db.listSessionLog(Date.now() - WEEK_MS).then(
      (entries) => {
        if (!cancelled) setHistory({ status: 'ready', entries });
      },
      () => {
        if (!cancelled) setHistory({ status: 'error' });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [db]);

  async function change(patch: Parameters<typeof updateSettings>[0]) {
    setFailed(false);
    try {
      await updateSettings(patch);
    } catch {
      setFailed(true);
    }
  }

  async function clearAll() {
    setConfirming(false);
    setFailed(false);
    try {
      await clearAllData();
      notify(t('toast.cleared'), 'success');
    } catch {
      setFailed(true);
    }
  }

  async function dropPin() {
    setConfirmingPin(false);
    setFailed(false);
    try {
      await removePin();
      notify(t('toast.pinRemoved'), 'success');
    } catch {
      setFailed(true);
    }
  }

  const hasPin = settings.pinLock !== null;
  const counts = { album: 0, face: 0, voice: 0 };
  if (history.status === 'ready') {
    for (const e of history.entries) counts[e.type] += 1;
  }
  const total = counts.album + counts.face + counts.voice;

  return (
    <Screen withBottomBar>
      <header className="pt-safe px-5 pb-3 pt-6">
        <h1 className="font-display text-title text-ink">{t('settings.title')}</h1>
      </header>
      <main className="space-y-6 px-5 pt-3">
        {failed ? (
          <Panel tone="lantern" role="alert">
            {t('error.generic')}
          </Panel>
        ) : null}

        <Card as="div" className="space-y-3">
          <h2 className="font-display text-lead text-ink">{t('settings.language')}</h2>
          <div className="space-y-3">
            {LANGS.map((l) => (
              <ChoiceTile key={l.lang} selected={lang === l.lang} onSelect={() => void change({ lang: l.lang })}>
                {t(l.label)}
              </ChoiceTile>
            ))}
          </div>
        </Card>

        <div className="space-y-3">
          <Switch
            label={t('settings.browseOnly')}
            hint={t('settings.browseOnlyHint')}
            checked={settings.browseOnly}
            onChange={(v) => void change({ browseOnly: v })}
          />
          <Switch
            label={t('settings.voice')}
            hint={t('settings.voiceHint')}
            checked={settings.voiceEnabled}
            onChange={(v) => void change({ voiceEnabled: v })}
          />
        </div>

        <Card className="space-y-3">
          <h2 className="font-display text-lead text-ink">{t('settings.pin.title')}</h2>
          <p className="text-body text-ink">{t(hasPin ? 'settings.pin.on' : 'settings.pin.off')}</p>
          <SecondaryButton icon={<KeyRound />} onClick={() => navigate({ name: 'pin' })}>
            {t(hasPin ? 'settings.pin.change' : 'settings.pin.set')}
          </SecondaryButton>
          {hasPin ? (
            <DangerButton quiet onClick={() => setConfirmingPin(true)}>
              {t('settings.pin.remove')}
            </DangerButton>
          ) : null}
        </Card>

        <Card className="space-y-3">
          <h2 className="font-display text-lead text-ink">{t('settings.starter')}</h2>
          <p className="text-caption text-ink-soft">{t('settings.starterHint')}</p>
          <div className="space-y-3">
            {STARTERS.map((s) => (
              <ChoiceTile
                key={s.value}
                selected={settings.defaultStarter === s.value}
                onSelect={() => void change({ defaultStarter: s.value })}
              >
                {t(s.label)}
              </ChoiceTile>
            ))}
          </div>
        </Card>

        <Card className="space-y-2">
          <h2 className="font-display text-lead text-ink">{t('settings.history.title')}</h2>
          {history.status === 'loading' ? (
            <p role="status" className="text-body text-ink-soft">{t('common.loading')}</p>
          ) : history.status === 'error' ? (
            <p className="text-body text-ink-soft">{t('error.generic')}</p>
          ) : total === 0 ? (
            <p className="text-body text-ink-soft">{t('settings.history.empty')}</p>
          ) : (
            <ul className="space-y-1 text-body text-ink">
              <li>{t('settings.history.album', { count: counts.album })}</li>
              <li>{t('settings.history.face', { count: counts.face })}</li>
              <li>{t('settings.history.voice', { count: counts.voice })}</li>
            </ul>
          )}
        </Card>

        <SecondaryButton icon={<CircleHelp />} onClick={() => navigate({ name: 'help' })}>
          {t('settings.help')}
        </SecondaryButton>

        <Card className="space-y-2">
          <h2 className="font-display text-lead text-ink">{t('settings.privacy.title')}</h2>
          <p className="text-body text-ink">{t('privacy.short')}</p>
          <p className="text-body text-ink-soft">{t('settings.privacy.body')}</p>
        </Card>

        <DangerButton quiet icon={<Trash2 />} onClick={() => setConfirming(true)}>
          {t('settings.clear')}
        </DangerButton>

        <p className="pb-4 text-center text-caption text-ink-soft">
          {t('settings.version', { version: APP_VERSION })}
        </p>
        {engineInfo ? (
          // Technical line for phone tests: which mode the face engine runs in and how exact it is.
          <p className="pb-4 text-center text-caption text-ink-soft" lang="en">
            {`face engine: ${engineInfo.mode} · check ${engineInfo.distance.toFixed(4)}`}
            {engineInfo.rejectedDistance !== null
              ? ` · graphics ${Number.isNaN(engineInfo.rejectedDistance) ? 'failed' : engineInfo.rejectedDistance.toFixed(4)}`
              : ''}
          </p>
        ) : null}
      </main>
      <ConfirmDialog
        open={confirming}
        danger
        title={t('settings.clear.title')}
        body={t('settings.clear.body')}
        confirmLabel={t('settings.clear.confirm')}
        onConfirm={() => void clearAll()}
        onCancel={() => setConfirming(false)}
      />
      <ConfirmDialog
        open={confirmingPin}
        danger
        title={t('settings.pin.remove.title')}
        body={t('settings.pin.remove.body')}
        confirmLabel={t('settings.pin.remove.confirm')}
        onConfirm={() => void dropPin()}
        onCancel={() => setConfirmingPin(false)}
      />
      <BottomBar />
    </Screen>
  );
}
