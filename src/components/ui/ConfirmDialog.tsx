import { useEffect, useId, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { useApp } from '../../app/appContext';
import { DangerButton } from './DangerButton';
import { PrimaryButton } from './PrimaryButton';
import { SecondaryButton } from './SecondaryButton';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  /** Defaults to `common.cancel`. */
  cancelLabel?: string;
  /** Use the brick DangerButton for confirm. */
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function DialogInner({ title, body, confirmLabel, cancelLabel, danger, onConfirm, onCancel }: Omit<ConfirmDialogProps, 'open'>) {
  const { t } = useApp();
  const titleId = useId();
  const bodyId = useId();
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    sheetRef.current?.querySelector<HTMLElement>('[data-cancel]')?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
      before?.focus?.();
    };
  }, []);

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onCancel();
      return;
    }
    if (e.key !== 'Tab') return;
    const items = sheetRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
    if (!items || items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || !sheetRef.current?.contains(active))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (active === last || !sheetRef.current?.contains(active))) {
      e.preventDefault();
      first.focus();
    }
  }

  const Confirm = danger ? DangerButton : PrimaryButton;

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-ink/50 animate-fade-in sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
      onKeyDown={onKeyDown}
    >
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        className="w-full max-w-md rounded-t-sheet bg-surface p-6 pb-safe sm:rounded-sheet"
      >
        <h2 id={titleId} className="font-display text-title text-ink">
          {title}
        </h2>
        <p id={bodyId} className="mt-2 text-body text-ink-soft">
          {body}
        </p>
        <div className="mt-6 space-y-3">
          <SecondaryButton onClick={onCancel} data-cancel="">
            {cancelLabel ?? t('common.cancel')}
          </SecondaryButton>
          <Confirm onClick={onConfirm}>{confirmLabel}</Confirm>
        </div>
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, ...rest }: ConfirmDialogProps) {
  if (!open) return null;
  return <DialogInner {...rest} />;
}
