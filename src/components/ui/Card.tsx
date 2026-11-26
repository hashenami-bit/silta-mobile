import type { ButtonHTMLAttributes, HTMLAttributes } from 'react';
import { cn } from './cn';

export type CardProps =
  | ({ as?: 'div' } & HTMLAttributes<HTMLDivElement>)
  | ({ as: 'button' } & ButtonHTMLAttributes<HTMLButtonElement>);

/** `as="button"` makes a whole list row tappable (add an `aria-label`). */
export function Card(props: CardProps) {
  if (props.as === 'button') {
    const { as: _as, className, type = 'button', ...rest } = props;
    void _as;
    return (
      <button
        type={type}
        {...rest}
        className={cn(
          'flex w-full min-h-tap-lg items-center gap-4 rounded-card bg-surface p-5 text-left shadow-lift active:bg-river-tint disabled:opacity-50 disabled:cursor-not-allowed',
          className,
        )}
      />
    );
  }
  const { as: _as, className, ...rest } = props;
  void _as;
  return <div {...rest} className={cn('rounded-card bg-surface p-5 shadow-lift', className)} />;
}
