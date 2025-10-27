/**
 * Toast Notification Hook
 * Simple implementation - can be replaced with Sonner in production
 */

import { useState, useCallback } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

let toastCounter = 0;
let listeners: Array<(toast: Toast) => void> = [];

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((type: ToastType, message: string, duration = 5000) => {
    const id = `toast-${Date.now()}-${toastCounter++}`;
    const toast: Toast = { id, type, message, duration };

    setToasts(prev => [...prev, toast]);
    listeners.forEach(listener => listener(toast));

    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }

    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return {
    toasts,
    showToast,
    removeToast,
    success: (message: string, duration?: number) => showToast('success', message, duration),
    error: (message: string, duration?: number) => showToast('error', message, duration),
    info: (message: string, duration?: number) => showToast('info', message, duration),
    warning: (message: string, duration?: number) => showToast('warning', message, duration),
  };
}

// Simple toast container component
export function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
  if (toasts.length === 0) return null;

  const getToastStyles = (type: ToastType) => {
    switch (type) {
      case 'success': return 'bg-green-900/95 border-green-600';
      case 'error': return 'bg-red-900/95 border-red-600';
      case 'warning': return 'bg-yellow-900/95 border-yellow-600';
      default: return 'bg-blue-900/95 border-blue-600';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`${getToastStyles(toast.type)} border-2 rounded-lg p-4 shadow-lg animate-in slide-in-from-top duration-300 max-w-sm`}
        >
          <div className="flex items-start gap-3">
            <p className="text-sm text-white flex-1">{toast.message}</p>
            <button
              onClick={() => onRemove(toast.id)}
              className="text-white/70 hover:text-white"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
