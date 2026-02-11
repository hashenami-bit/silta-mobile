export type ToastType = 'success' | 'error' | 'info';

let addToastFn: ((message: string, type: ToastType) => void) | null = null;

export function showToast(message: string, type: ToastType = 'info') {
  if (addToastFn) {
    addToastFn(message, type);
  }
}

export function registerToastHandler(handler: (message: string, type: ToastType) => void) {
  addToastFn = handler;
}

export function unregisterToastHandler() {
  addToastFn = null;
}
