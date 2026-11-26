import { useApp } from '../app/appContext';
import { Card, Screen, ScreenHeader } from '../components/ui';
import type { TextKey } from '../i18n';

const ITEMS: Array<{ q: TextKey; a: TextKey }> = [
  { q: 'help.q1', a: 'help.a1' },
  { q: 'help.q2', a: 'help.a2' },
  { q: 'help.q3', a: 'help.a3' },
  { q: 'help.q4', a: 'help.a4' },
  { q: 'help.q5', a: 'help.a5' },
  { q: 'help.q6', a: 'help.a6' },
];

export function HelpScreen() {
  const { t, back } = useApp();
  return (
    <Screen>
      <ScreenHeader title={t('help.title')} onBack={back} />
      <main className="space-y-3 px-5 pb-8 pt-3">
        {ITEMS.map((item) => (
          <Card key={item.q}>
            <h2 className="font-display text-lead text-ink">{t(item.q)}</h2>
            <p className="mt-2 text-body text-ink-soft">{t(item.a)}</p>
          </Card>
        ))}
      </main>
    </Screen>
  );
}
