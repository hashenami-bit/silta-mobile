import { useEffect, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import type { ToastType } from '../utils/toast';
import { registerToastHandler, unregisterToastHandler } from '../utils/toast';

interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
}

let toastId = 0;

export const ToastContainer = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  useEffect(() => {
    registerToastHandler(addToast);
    return () => { unregisterToastHandler(); };
  }, [addToast]);

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 w-full max-w-sm px-4">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`flex items-start gap-3 p-4 rounded-2xl shadow-lg backdrop-blur-lg text-white animate-slide-down ${
            toast.type === 'success' ? 'bg-green-600 bg-opacity-90' :
            toast.type === 'error' ? 'bg-red-600 bg-opacity-90' :
            'bg-gray-800 bg-opacity-90'
          }`}
        >
          {toast.type === 'success' && <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
          {toast.type === 'error' && <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
          {toast.type === 'info' && <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />}
          <p className="text-sm flex-1">{toast.message}</p>
          <button onClick={() => removeToast(toast.id)} className="flex-shrink-0 mt-0.5">
            <X className="w-4 h-4 opacity-70 hover:opacity-100" />
          </button>
        </div>
      ))}
    </div>
  );
};
