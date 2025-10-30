// src/components/OfflineIndicator.tsx
// Componente para indicar estado offline

'use client';

import { useNetworkStatus } from '@/lib/hooks/useNetworkStatus';
import { WifiOff, Wifi, Gauge } from 'lucide-react';

export default function OfflineIndicator() {
  // Siempre ocultar en desarrollo local
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const isLocalhost = 
      hostname === 'localhost' || 
      hostname === '127.0.0.1' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.') ||
      hostname.includes('local');
    
    // En desarrollo, nunca mostrar el indicador
    if (isLocalhost) {
      return null;
    }
  }

  const { isOnline, isSlowConnection, effectiveType } = useNetworkStatus();

  // No mostrar nada si todo está bien
  if (isOnline && !isSlowConnection) {
    return null;
  }

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 p-3 rounded-lg shadow-lg flex items-center gap-2 ${
        !isOnline
          ? 'bg-red-500 text-white'
          : isSlowConnection
          ? 'bg-yellow-500 text-white'
          : 'bg-blue-500 text-white'
      }`}
    >
      {!isOnline ? (
        <>
          <WifiOff className="w-4 h-4" />
          <span className="text-sm font-medium">Sin conexión</span>
        </>
      ) : isSlowConnection ? (
        <>
          <Gauge className="w-4 h-4" />
          <span className="text-sm font-medium">
            Conexión lenta ({effectiveType || '2g'})
          </span>
        </>
      ) : (
        <>
          <Wifi className="w-4 h-4" />
          <span className="text-sm font-medium">Conectado</span>
        </>
      )}
    </div>
  );
}

