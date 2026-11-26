import { useApp } from '../../app/appContext';
import { cn } from './cn';

export interface SwitchProps {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function Switch({ label, hint, checked, onChange, disabled }: SwitchProps) {
  const { t } = useApp();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex min-h-tap-lg w-full items-center justify-between gap-4 rounded-tile bg-surface p-4 text-left disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-body font-semibold text-ink">{label}</span>
        {hint ? <span className="mt-1 block text-caption text-ink-soft">{hint}</span> : null}
      </span>
      <span className="flex shrink-0 items-center gap-3">
        <span className="text-caption font-semibold text-ink">{checked ? t('common.on') : t('common.off')}</span>
        <span
          aria-hidden="true"
          className={cn('block h-9 w-16 shrink-0 rounded-full p-1 transition-colors', checked ? 'bg-river' : 'bg-edge')}
        >
          <span className={cn('block h-7 w-7 rounded-full bg-white transition-transform', checked && 'translate-x-7')} />
        </span>
      </span>
    </button>
  );
}
