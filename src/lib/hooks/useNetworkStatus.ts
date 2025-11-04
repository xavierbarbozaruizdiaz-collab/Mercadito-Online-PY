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

      // Confiar en navigator.onLine como fuente principal
      // Solo hacer verificación adicional si navigator dice offline Y hay información de conexión
      let isReallyOnline = navigator.onLine;
      
      // Si navigator dice offline, hacer una verificación más robusta
      if (!navigator.onLine) {
        // Si hay información de conexión activa, confiar en eso antes que hacer fetch
        if (connection && (connection.effectiveType || connection.downlink)) {
          // Si hay información de conexión, probablemente está online pero el navegador lo detectó mal
          isReallyOnline = true;
        } else {
          // Solo hacer fetch si realmente no hay información de conexión
          // Usar un endpoint más confiable que favicon.ico
          try {
            // Intentar hacer un fetch a la API de Supabase (que siempre está disponible)
            // Usar un endpoint que sabemos que existe y responde rápido
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 1500); // Timeout más corto
            
            try {
              // Intentar con un endpoint conocido que debería responder
              const response = await fetch(window.location.origin + '/api/health', { 
                method: 'HEAD', 
                cache: 'no-cache',
                signal: controller.signal
              });
              isReallyOnline = response.ok || response.status < 500; // Cualquier respuesta válida indica conexión
            } catch (fetchErr) {
              // Si /api/health no existe, intentar con la raíz
              try {
                const rootResponse = await fetch(window.location.origin, { 
                  method: 'HEAD', 
                  cache: 'no-cache',
                  signal: controller.signal
                });
                isReallyOnline = rootResponse.ok || rootResponse.status < 500;
              } catch {
                // Si ambos fallan, confiar en navigator.onLine (false)
                isReallyOnline = false;
              }
            } finally {
              clearTimeout(timeoutId);
            }
          } catch (err) {
            // Si hay un error de red real, confiar en navigator.onLine
            isReallyOnline = false;
          }
        }
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

