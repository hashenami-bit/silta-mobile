import { useApp } from '../../app/appContext';
import { cn } from './cn';

export interface StepBarProps {
  /** 1-based current step. */
  current: number;
  total: number;
}

export function StepBar({ current, total }: StepBarProps) {
  const { t } = useApp();
  return (
    <div>
      <p className="text-caption text-ink-soft">{t('add.step', { current, total })}</p>
      <div aria-hidden="true" className="mt-2 flex gap-2">
        {Array.from({ length: total }, (_, i) => (
          <div key={i} className={cn('h-2 flex-1 rounded-full', i < current ? 'bg-river' : 'bg-hairline')} />
        ))}
      </div>
    </div>
  );
}
