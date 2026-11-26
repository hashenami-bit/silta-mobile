import { Check } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

export interface ChoiceTileProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onSelect' | 'aria-label'> {
  selected?: boolean;
  onSelect: () => void;
  children: ReactNode;
  ariaLabel?: string;
  /** `praise` = lantern colours (album correct answer). */
  tone?: 'default' | 'praise';
}

export function ChoiceTile({ selected = false, onSelect, children, ariaLabel, tone = 'default', disabled, className, type = 'button', ...rest }: ChoiceTileProps) {
  const praise = tone === 'praise';
  return (
    <button
      type={type}
      {...rest}
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      aria-label={ariaLabel}
      className={cn(
        'flex min-h-tap-lg w-full items-center justify-center gap-3 rounded-tile border-2 px-4 py-3 text-lead font-semibold disabled:cursor-not-allowed',
        praise
          ? 'border-lantern bg-lantern-tint text-lantern-ink'
          : selected
            ? 'border-river bg-river-tint text-river'
            : 'border-edge bg-surface text-ink',
        disabled && !selected && !praise && 'opacity-60',
        className,
      )}
    >
      {selected || praise ? <Check aria-hidden="true" className="shrink-0" /> : null}
      <span className="min-w-0">{children}</span>
    </button>
  );
}
