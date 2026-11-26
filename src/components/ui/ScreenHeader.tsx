import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { useApp } from '../../app/appContext';
import { cn } from './cn';

export interface ScreenHeaderProps {
  title: string;
  /** When given, shows the labelled back button. */
  onBack?: () => void;
  right?: ReactNode;
  className?: string;
}

export function ScreenHeader({ title, onBack, right, className }: ScreenHeaderProps) {
  const { t } = useApp();
  return (
    <header className={cn('pt-safe px-5 pb-3', className)}>
      {onBack || right ? (
        <div className="flex items-center justify-between gap-3">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="-ml-2 inline-flex min-h-tap items-center gap-2 rounded-btn px-2 text-lead font-semibold text-river"
            >
              <ArrowLeft aria-hidden="true" />
              {t('common.back')}
            </button>
          ) : (
            <span />
          )}
          {right}
        </div>
      ) : null}
      <h1 className="mt-1 font-display text-title text-ink">{title}</h1>
    </header>
  );
}
