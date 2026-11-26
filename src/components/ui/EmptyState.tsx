import type { ReactNode } from 'react';

export interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  body: string;
  /** Usually one PrimaryButton (or two buttons in a fragment). */
  action?: ReactNode;
  role?: 'alert' | 'status';
}

export function EmptyState({ icon, title, body, action, role }: EmptyStateProps) {
  return (
    <div role={role} className="mx-auto flex max-w-sm flex-col items-center gap-4 px-5 py-12 text-center">
      <div aria-hidden="true" className="text-river [&>svg]:h-14 [&>svg]:w-14">
        {icon}
      </div>
      <h2 className="font-display text-title text-ink">{title}</h2>
      <p className="text-body text-ink-soft">{body}</p>
      {action ? <div className="w-full space-y-3">{action}</div> : null}
    </div>
  );
}
