'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type?: Toast['type'], duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((
    message: string,
    type: Toast['type'] = 'info',
    duration: number = 4000
  ) => {
    const id = Math.random().toString(36).substring(7);
    const newToast: Toast = { id, type, message, duration };

    setToasts((prev) => [...prev, newToast]);

    // Auto-remove after duration
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toast container */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    info: Info,
    warning: AlertTriangle,
  };

  const colors = {
    success: 'bg-green-600 border-green-500',
    error: 'bg-red-600 border-red-500',
    info: 'bg-blue-600 border-blue-500',
    warning: 'bg-yellow-600 border-yellow-500',
  };

  const Icon = icons[toast.type];

  return (
    <div
      className={`${colors[toast.type]} border text-white rounded-lg shadow-xl backdrop-blur-sm p-4 min-w-[300px] max-w-md pointer-events-auto animate-in slide-in-from-right duration-300`}
    >
      <div className="flex items-start gap-3">
        <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <p className="flex-1 text-sm font-medium">{toast.message}</p>
        <button
          onClick={() => onRemove(toast.id)}
          className="flex-shrink-0 hover:bg-white/20 rounded p-1 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
