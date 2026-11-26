import { Share } from 'lucide-react';
import { useApp } from '../app/appContext';
import { Card, Panel, Screen, TextButton } from '../components/ui';
import type { TextKey } from '../i18n';

const STEPS: TextKey[] = ['install.step1', 'install.step2', 'install.step3'];

interface InstallHintScreenProps {
  /** The caregiver chose to keep using the browser tab for now. */
  onContinue: () => void;
}

/** Shown in an iPhone browser tab: saved data is only safe in the Home Screen app. */
export function InstallHintScreen({ onContinue }: InstallHintScreenProps) {
  const { t } = useApp();
  return (
    <Screen>
      <main className="space-y-6 px-5 pb-8 pt-12">
        <Share aria-hidden="true" className="h-12 w-12 text-river" />
        <h1 className="font-display text-title text-ink">{t('install.title')}</h1>
        <Panel tone="lantern">{t('install.body')}</Panel>
        <ol className="space-y-3">
          {STEPS.map((step, index) => (
            <li key={step}>
              <Card className="flex items-center gap-4">
                <span
                  aria-hidden="true"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-river text-lead font-semibold text-white"
                >
                  {index + 1}
                </span>
                <span className="text-lead text-ink">{t(step)}</span>
              </Card>
            </li>
          ))}
        </ol>
        <TextButton onClick={onContinue}>{t('install.continue')}</TextButton>
      </main>
    </Screen>
  );
}
