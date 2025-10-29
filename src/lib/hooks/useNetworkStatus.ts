// src/lib/hooks/useNetworkStatus.ts
// Hook para detectar estado de conexión

'use client';

import { useState, useEffect } from 'react';

interface UseNetworkStatusReturn {
  isOnline: boolean;
  isSlowConnection: boolean;
  connectionType?: string;
  effectiveType?: '4g' | '3g' | '2g' | 'slow-2g';
  downlink?: number;
  saveData?: boolean;
}

export function useNetworkStatus(): UseNetworkStatusReturn {
  const [status, setStatus] = useState<UseNetworkStatusReturn>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSlowConnection: false,
  });

  useEffect(() => {
    if (typeof navigator === 'undefined') return;

    const updateStatus = () => {
      const connection = (navigator as any).connection ||
        (navigator as any).mozConnection ||
        (navigator as any).webkitConnection;

      const newStatus: UseNetworkStatusReturn = {
        isOnline: navigator.onLine,
        isSlowConnection: false,
      };

      if (connection) {
        newStatus.connectionType = connection.type;
        newStatus.effectiveType = connection.effectiveType;
        newStatus.downlink = connection.downlink;
        newStatus.saveData = connection.saveData;

        // Determinar si es conexión lenta
        if (
          connection.effectiveType === '2g' ||
          connection.effectiveType === 'slow-2g' ||
          (connection.downlink && connection.downlink < 1.5)
        ) {
          newStatus.isSlowConnection = true;
        }
      }

      setStatus(newStatus);
    };

    // Estado inicial
    updateStatus();

    // Listeners para cambios en la conexión
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);

    if ((navigator as any).connection) {
      (navigator as any).connection.addEventListener('change', updateStatus);
    }

    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
      if ((navigator as any).connection) {
        (navigator as any).connection.removeEventListener('change', updateStatus);
      }
    };
  }, []);

  return status;
}

