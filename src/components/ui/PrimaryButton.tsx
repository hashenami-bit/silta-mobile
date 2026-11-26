import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

export interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode;
}

export function PrimaryButton({ children, icon, className, type = 'button', ...rest }: PrimaryButtonProps) {
  return (
    <button
      type={type}
      {...rest}
      className={cn(
        'inline-flex w-full min-h-tap items-center justify-center gap-3 rounded-btn bg-river px-6 py-3 text-lead font-semibold text-white shadow-lift active:bg-river-dark disabled:opacity-50 disabled:cursor-not-allowed',
        className,
      )}
    >
      {icon ? <span aria-hidden="true" className="inline-flex shrink-0">{icon}</span> : null}
      {children}
    </button>
  );
}
