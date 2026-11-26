import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

export interface SecondaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode;
}

export function SecondaryButton({ children, icon, className, type = 'button', ...rest }: SecondaryButtonProps) {
  return (
    <button
      type={type}
      {...rest}
      className={cn(
        'inline-flex w-full min-h-tap items-center justify-center gap-3 rounded-btn border-2 border-river bg-surface px-6 py-3 text-lead font-semibold text-river active:bg-river-tint disabled:opacity-50 disabled:cursor-not-allowed',
        className,
      )}
    >
      {icon ? <span aria-hidden="true" className="inline-flex shrink-0">{icon}</span> : null}
      {children}
    </button>
  );
}
