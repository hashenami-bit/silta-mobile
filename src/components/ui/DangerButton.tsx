import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

export interface DangerButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode;
  /** Outlined brick style, for "Delete person" on a page. */
  quiet?: boolean;
}

export function DangerButton({ children, icon, quiet, className, type = 'button', ...rest }: DangerButtonProps) {
  return (
    <button
      type={type}
      {...rest}
      className={cn(
        'inline-flex w-full min-h-tap items-center justify-center gap-3 rounded-btn px-6 py-3 text-lead font-semibold disabled:opacity-50 disabled:cursor-not-allowed',
        quiet
          ? 'border-2 border-brick bg-surface text-brick active:bg-brick-tint'
          : 'bg-brick text-white active:bg-brick-dark',
        className,
      )}
    >
      {icon ? <span aria-hidden="true" className="inline-flex shrink-0">{icon}</span> : null}
      {children}
    </button>
  );
}
