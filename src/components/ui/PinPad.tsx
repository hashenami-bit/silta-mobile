import { Delete } from 'lucide-react';
import { useApp } from '../../app/appContext';
import { cn } from './cn';

export interface PinPadProps {
  /** Digits entered so far. */
  value: string;
  onChange: (value: string) => void;
  /** How many digits the PIN has. */
  length: number;
  disabled?: boolean;
}

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
const KEY =
  'flex min-h-tap-lg flex-col items-center justify-center rounded-tile bg-surface shadow-lift active:bg-river-tint disabled:cursor-not-allowed disabled:opacity-50';

/** Big number keys with dots that show how many digits are in. The digits themselves are never shown. */
export function PinPad({ value, onChange, length, disabled }: PinPadProps) {
  const { t } = useApp();
  const full = value.length >= length;

  function press(digit: string) {
    if (!full) onChange(value + digit);
  }

  return (
    <div className="space-y-6">
      <p aria-live="polite" className="sr-only">
        {t('lock.entered', { count: value.length, total: length })}
      </p>
      <div aria-hidden="true" className="flex justify-center gap-4">
        {Array.from({ length }, (_, i) => (
          <span
            key={i}
            className={cn('block h-5 w-5 rounded-full border-2 border-river', i < value.length ? 'bg-river' : 'bg-surface')}
          />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {DIGITS.map((digit) => (
          <button
            key={digit}
            type="button"
            disabled={disabled}
            onClick={() => press(digit)}
            className={cn(KEY, 'font-display text-title text-ink')}
          >
            {digit}
          </button>
        ))}
        <span />
        <button
          type="button"
          disabled={disabled}
          onClick={() => press('0')}
          className={cn(KEY, 'font-display text-title text-ink')}
        >
          0
        </button>
        <button
          type="button"
          disabled={disabled || value.length === 0}
          onClick={() => onChange(value.slice(0, -1))}
          className={cn(KEY, 'gap-1 text-caption font-semibold text-ink-soft')}
        >
          <Delete aria-hidden="true" size={28} />
          {t('lock.erase')}
        </button>
      </div>
    </div>
  );
}
