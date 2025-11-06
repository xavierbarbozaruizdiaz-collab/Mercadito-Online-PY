'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

interface ToastProviderProps {
  children?: ReactNode;
}

/**
 * ToastProvider simple y robusto
 * Si hay errores, simplemente no muestra toasts pero no rompe la app
 */
export default function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((
    message: string, 
    type: ToastType = 'info', 
    duration: number = 3000
  ) => {
    try {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: Toast = { id, message, type, duration };
      
      setToasts((prev) => [...prev, newToast]);

      // Auto-remover después de la duración
      if (duration > 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, duration);
      }
    } catch (error) {
      // Si falla, simplemente no mostrar el toast
      console.warn('Error al mostrar toast:', error);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    try {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    } catch (error) {
      // Si falla, ignorar
    }
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children || null}
      {/* Container de toasts */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => {
          const bgColor = {
            success: 'bg-green-500',
            error: 'bg-red-500',
            info: 'bg-blue-500',
            warning: 'bg-yellow-500',
          }[toast.type] || 'bg-gray-500';

          return (
            <div
              key={toast.id}
              className={`
                ${bgColor} text-white px-4 py-3 rounded-lg shadow-lg
                pointer-events-auto animate-in slide-in-from-right
                max-w-sm
              `}
              role="alert"
            >
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-medium">{toast.message}</p>
                <button
                  onClick={() => removeToast(toast.id)}
                  className="text-white hover:text-gray-200 transition-colors"
                  aria-label="Cerrar"
                >
                  ×
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    // Si no hay provider, retornar función no-op
    return {
      showToast: () => {},
      removeToast: () => {},
      toasts: [],
    };
  }
  return context;
}
