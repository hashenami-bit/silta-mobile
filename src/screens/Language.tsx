import { useState } from 'react';
import { useApp } from '../app/appContext';
import { ChoiceTile, Panel, Screen } from '../components/ui';
import { translate } from '../i18n';
import type { Lang } from '../lib/types';

export function LanguageScreen() {
  const { t, updateSettings } = useApp();
  const [chosen, setChosen] = useState<Lang | null>(null);
  const [failed, setFailed] = useState(false);

  async function choose(lang: Lang) {
    setChosen(lang);
    setFailed(false);
    try {
      await updateSettings({ lang });
    } catch {
      setFailed(true);
    }
  }

  return (
    <Screen>
      <main className="px-5 pt-12 pb-8">
        <h1 className="font-display text-title text-ink">
          <span className="block">{translate('uz', 'start.title')}</span>
          <span className="mt-1 block">{translate('ru', 'start.title')}</span>
        </h1>
        <div className="mt-8 space-y-3">
          <ChoiceTile onSelect={() => void choose('uz')} className="min-h-[7rem] text-title">
            {t('start.uz')}
          </ChoiceTile>
          <ChoiceTile onSelect={() => void choose('ru')} className="min-h-[7rem] text-title">
            {t('start.ru')}
          </ChoiceTile>
        </div>
        {chosen ? (
          <p className="mt-6 text-caption text-ink-soft">{translate(chosen, 'start.subtitle')}</p>
        ) : null}
        {failed ? (
          <Panel tone="lantern" role="alert" className="mt-6">
            {translate(chosen ?? 'uz', 'error.generic')}
          </Panel>
        ) : null}
      </main>
    </Screen>
  );
}
