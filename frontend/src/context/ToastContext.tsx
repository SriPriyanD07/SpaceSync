'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
}

export interface ToastContextType {
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: ToastType, title: string, description?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, description }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = useCallback((title: string, description?: string) => addToast('success', title, description), [addToast]);
  const error = useCallback((title: string, description?: string) => addToast('error', title, description), [addToast]);
  const info = useCallback((title: string, description?: string) => addToast('info', title, description), [addToast]);
  const warning = useCallback((title: string, description?: string) => addToast('warning', title, description), [addToast]);

  return (
    <ToastContext.Provider value={{ success, error, info, warning }}>
      {children}
      {/* Fixed top-right notification container: positioned at top: 80px, right: 24px, responsive on mobile */}
      <div
        className="fixed top-20 right-4 sm:right-6 z-[100] flex flex-col gap-2.5 max-w-[360px] w-[calc(100vw-2rem)] sm:w-88 pointer-events-none"
        aria-live="polite"
        role="region"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto bg-white border border-neutral-300 shadow-md p-3.5 sm:p-4 text-xs font-mono transition-all duration-300 animate-in fade-in slide-in-from-top-2"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    t.type === 'success'
                      ? 'bg-emerald-600'
                      : t.type === 'error'
                      ? 'bg-rose-600'
                      : t.type === 'warning'
                      ? 'bg-amber-600'
                      : 'bg-neutral-500'
                  }`}
                />
                <span className="font-mono text-[11px] font-bold tracking-wider uppercase text-neutral-950">
                  {t.title}
                </span>
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="text-neutral-400 hover:text-neutral-900 p-0.5 transition-colors cursor-pointer"
                aria-label="Close notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {t.description && (
              <div className="pl-4 mt-1.5 font-sans text-xs text-neutral-600 space-y-0.5 leading-relaxed">
                {t.description.split('\n').map((line, idx) => (
                  <div key={idx} className={idx > 0 ? 'font-mono text-[11px] text-neutral-500' : ''}>
                    {line}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

