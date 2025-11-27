// ============================================
// MERCADITO ONLINE PY - USE TOAST HOOK
// Hook para usar toast notifications
// ============================================

import toast from 'react-hot-toast';

export function useToast() {
  return {
    success: (message: string) => toast.success(message),
    error: (message: string) => toast.error(message),
    loading: (message: string) => toast.loading(message),
    info: (message: string) => toast(message, { icon: 'ℹ️' }),
    warning: (message: string) => toast(message, { 
      icon: '⚠️',
      style: {
        borderLeft: '4px solid #f59e0b',
      },
    }),
    promise: <T,>(
      promise: Promise<T>,
      messages: {
        loading: string;
        success: string;
        error: string;
      }
    ) => toast.promise(promise, messages),
  };
}








