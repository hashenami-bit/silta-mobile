import { Camera, Images, Mic } from 'lucide-react';
import type { ReactNode } from 'react';
import { useApp } from '../app/appContext';
import type { Route } from '../app/navigation';
import { BottomBar, PrimaryButton, Screen, TextButton } from '../components/ui';
import { cn } from '../components/ui/cn';
import type { TextKey } from '../i18n';

interface ActionCardProps {
  icon: ReactNode;
  label: string;
  hint: string;
  filled?: boolean;
  onClick: () => void;
}

function ActionCard({ icon, label, hint, filled, onClick }: ActionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex min-h-[7.5rem] w-full items-center gap-4 rounded-card p-5 text-left shadow-lift',
        filled ? 'bg-river text-white active:bg-river-dark' : 'bg-surface text-ink active:bg-river-tint',
      )}
    >
      <span aria-hidden="true" className={cn('shrink-0', !filled && 'text-river')}>
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block font-display text-title">{label}</span>
        <span className={cn('mt-1 block text-body', filled ? 'text-white/90' : 'text-ink-soft')}>{hint}</span>
      </span>
    </button>
  );
}

export function HomeScreen() {
  const { t, people, settings, navigate } = useApp();

  const cards: Array<{ route: Route; icon: ReactNode; label: TextKey; hint: TextKey; filled?: boolean }> = [
    { route: { name: 'album' }, icon: <Images size={40} />, label: 'home.album', hint: 'home.albumHint', filled: true },
    { route: { name: 'recognize' }, icon: <Camera size={40} />, label: 'home.recognize', hint: 'home.recognizeHint' },
  ];
  if (settings.voiceEnabled) {
    cards.push({ route: { name: 'voice' }, icon: <Mic size={40} />, label: 'home.voice', hint: 'home.voiceHint' });
  }

  return (
    <Screen withBottomBar>
      <header className="pt-safe px-5 pb-3 pt-6">
        <h1 className="font-display text-title text-ink">{t('home.title')}</h1>
        <p className="mt-1 text-body text-ink-soft">{t('home.subtitle')}</p>
      </header>
      <main className="space-y-6 px-5 pt-3">
        {people.length === 0 ? (
          <div className="space-y-4 rounded-card bg-lantern-tint p-5 text-lantern-ink">
            <h2 className="font-display text-title">{t('home.setup.title')}</h2>
            <p className="text-body">{t('home.setup.body')}</p>
            <PrimaryButton onClick={() => navigate({ name: 'addPerson' })}>{t('home.setup.action')}</PrimaryButton>
          </div>
        ) : null}
        <div className="space-y-3">
          {cards.map((c) => (
            <ActionCard
              key={c.route.name}
              icon={c.icon}
              label={t(c.label)}
              hint={t(c.hint)}
              filled={c.filled}
              onClick={() => navigate(c.route)}
            />
          ))}
        </div>
        <div className="flex justify-center">
          <TextButton onClick={() => navigate({ name: 'help' })}>{t('home.helpLink')}</TextButton>
        </div>
      </main>
      <BottomBar />
    </Screen>
  );
}
