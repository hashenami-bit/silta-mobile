import { Home, Settings, Users } from 'lucide-react';
import type { ComponentType } from 'react';
import { useApp } from '../../app/appContext';
import type { TextKey } from '../../i18n';
import { cn } from './cn';

type TabName = 'home' | 'people' | 'settings';

const TABS: Array<{ name: TabName; label: TextKey; Icon: ComponentType<{ size?: number; 'aria-hidden'?: boolean }> }> = [
  { name: 'home', label: 'nav.home', Icon: Home },
  { name: 'people', label: 'nav.people', Icon: Users },
  { name: 'settings', label: 'nav.settings', Icon: Settings },
];

export function BottomBar() {
  const { t, route, navigate, replace, goHome } = useApp();

  function go(name: TabName) {
    if (route.name === name) return;
    if (name === 'home') goHome();
    // Tab to tab swaps the screen, so "back" never retraces tab taps.
    else if (route.name === 'people' || route.name === 'settings') replace({ name });
    else navigate({ name });
  }

  return (
    <nav
      aria-label={t('nav.label')}
      className="fixed inset-x-0 bottom-0 z-20 flex border-t border-hairline bg-surface pb-safe shadow-bar"
    >
      {TABS.map(({ name, label, Icon }) => {
        const active = route.name === name;
        return (
          <button
            key={name}
            type="button"
            onClick={() => go(name)}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex min-h-bar flex-1 flex-col items-center justify-center gap-1 text-caption font-semibold',
              active ? 'bg-river-tint text-river' : 'text-ink-soft',
            )}
          >
            <Icon size={28} aria-hidden={true} />
            {t(label)}
          </button>
        );
      })}
    </nav>
  );
}
