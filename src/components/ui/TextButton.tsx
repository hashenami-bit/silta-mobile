import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

export interface TextButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode;
}

export function TextButton({ children, icon, className, type = 'button', ...rest }: TextButtonProps) {
  return (
    <button
      type={type}
      {...rest}
      className={cn(
        'inline-flex min-h-tap items-center gap-2 rounded-btn px-2 text-body font-semibold text-river underline disabled:opacity-50 disabled:cursor-not-allowed',
        className,
      )}
    >
      {icon ? <span aria-hidden="true" className="inline-flex shrink-0">{icon}</span> : null}
      {children}
    </button>
  );
}
