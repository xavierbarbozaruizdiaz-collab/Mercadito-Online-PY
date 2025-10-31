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
  // Detectar si estamos en desarrollo local
  const isLocalhost = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || 
     window.location.hostname === '127.0.0.1' ||
     window.location.hostname.startsWith('192.168.') ||
     window.location.hostname.startsWith('10.') ||
     window.location.hostname.startsWith('172.') ||
     window.location.hostname.includes('local'));

  // En desarrollo local, SIEMPRE retornar online=true sin importar navigator.onLine
  const [status, setStatus] = useState<UseNetworkStatusReturn>({
    isOnline: isLocalhost ? true : (typeof navigator !== 'undefined' ? navigator.onLine : true),
    isSlowConnection: false,
  });

  useEffect(() => {
    if (typeof navigator === 'undefined') return;

    // En localhost, SIEMPRE considerar online (forzar true)
    if (isLocalhost) {
      setStatus({
        isOnline: true,
        isSlowConnection: false,
      });
      return; // Salir inmediatamente, no escuchar eventos de red en desarrollo
    }

    const updateStatus = async () => {
      const connection = (navigator as any).connection ||
        (navigator as any).mozConnection ||
        (navigator as any).webkitConnection;

      // Verificar conexión real haciendo un ping ligero
      let isReallyOnline = navigator.onLine;
      
      // Si navigator dice offline, verificar con un fetch rápido
      if (!navigator.onLine) {
        try {
          // Intentar hacer un fetch a un recurso pequeño para verificar conexión real
          const response = await fetch('/favicon.ico', { 
            method: 'HEAD', 
            cache: 'no-cache',
            signal: AbortSignal.timeout(2000) // Timeout de 2 segundos
          });
          isReallyOnline = response.ok;
        } catch (err) {
          // Si falla, está realmente offline
          isReallyOnline = false;
        }
      }
      
      // Si navigator dice offline pero tenemos información de conexión activa, confiar en eso
      if (!isReallyOnline && connection && connection.effectiveType) {
        // Si hay información de conexión, probablemente está online pero el navegador lo detectó mal
        isReallyOnline = true;
      }

      const newStatus: UseNetworkStatusReturn = {
        isOnline: isReallyOnline,
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
  }, [isLocalhost]);

  return status;
}

