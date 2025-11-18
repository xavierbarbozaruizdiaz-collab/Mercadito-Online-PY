'use client';

import { useEffect } from 'react';

type ToastProps = {
  id: string;
  message: string;
  type?: 'success' | 'error' | 'info';
  onDismiss: (id: string) => void;
  duration?: number;
  actionLabel?: string;
  onAction?: () => void;
};

export default function Toast({
  id,
  message,
  type = 'info',
  onDismiss,
  duration = 5000,
  actionLabel,
  onAction,
}: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(id), duration);
    return () => clearTimeout(timer);
  }, [id, duration, onDismiss]);

  const color =
    type === 'success'
      ? 'bg-emerald-600 hover:bg-emerald-700'
      : type === 'error'
      ? 'bg-red-600 hover:bg-red-700'
      : 'bg-blue-600 hover:bg-blue-700';

  return (
    <div className="pointer-events-auto w-full max-w-sm overflow-hidden rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5">
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-1 text-sm text-gray-900">{message}</div>
          <button
            onClick={() => onDismiss(id)}
            className="ml-3 inline-flex rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <span className="sr-only">Cerrar</span>
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M10 8.586l4.95-4.95a1 1 0 011.414 1.415L11.414 10l4.95 4.95a1 1 0 01-1.414 1.415L10 11.414l-4.95 4.95A1 1 0 013.636 15.95L8.586 11l-4.95-4.95A1 1 0 015.05 4.636L10 9.586z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
        {actionLabel && onAction && (
          <button
            onClick={() => {
              onAction();
              onDismiss(id);
            }}
            className={`mt-3 inline-flex w-full justify-center rounded-md px-3 py-2 text-sm font-semibold text-white ${color} focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500`}
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}

