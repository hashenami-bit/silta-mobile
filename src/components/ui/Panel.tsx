import type { ReactNode } from 'react';
import { cn } from './cn';

export interface PanelProps {
  tone: 'lantern' | 'river';
  title?: string;
  role?: 'status' | 'alert' | 'note';
  children: ReactNode;
  className?: string;
}

export function Panel({ tone, title, role, children, className }: PanelProps) {
  return (
    <div
      role={role}
      className={cn(
        'rounded-tile p-4 text-left text-body',
        tone === 'lantern' ? 'bg-lantern-tint text-lantern-ink' : 'bg-river-tint text-ink',
        className,
      )}
    >
      {title ? <p className="font-semibold">{title}</p> : null}
      <div>{children}</div>
    </div>
  );
}
