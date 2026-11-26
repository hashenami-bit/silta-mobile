import type { ReactNode } from 'react';
import { useApp } from '../../app/appContext';

export interface UnsureCardProps {
  /** Defaults to `recognize.unsure`. */
  sentence?: string;
  actions?: ReactNode;
}

export function UnsureCard({ sentence, actions }: UnsureCardProps) {
  const { t } = useApp();
  return (
    <div
      aria-live="polite"
      className="mx-auto w-full max-w-md animate-rise-in rounded-card bg-surface p-5 text-center shadow-lift"
    >
      <p className="py-4 font-display text-title text-ink">{sentence ?? t('recognize.unsure')}</p>
      {actions ? <div className="mt-4 space-y-3">{actions}</div> : null}
    </div>
  );
}
