import { Check, Info } from 'lucide-react';
import { useApp } from '../../app/appContext';

export function ToastHost() {
  const { toast, dismissToast } = useApp();
  return (
    <div role="status" aria-live="polite">
      {toast ? (
        <button
          key={toast.id}
          type="button"
          onClick={dismissToast}
          className="fixed inset-x-5 bottom-28 z-50 mx-auto flex min-h-tap max-w-md items-center gap-3 rounded-btn bg-ink px-5 py-4 text-left text-body font-semibold text-white shadow-lift animate-rise-in"
        >
          {toast.kind === 'success' ? (
            <Check aria-hidden="true" className="shrink-0" />
          ) : (
            <Info aria-hidden="true" className="shrink-0" />
          )}
          <span>{toast.text}</span>
        </button>
      ) : null}
    </div>
  );
}
