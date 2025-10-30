// src/components/OfflineIndicator.tsx
// Componente para indicar estado offline

'use client';

import { useNetworkStatus } from '@/lib/hooks/useNetworkStatus';
import { WifiOff, Wifi, Gauge } from 'lucide-react';

export default function OfflineIndicator() {
  const { isOnline, isSlowConnection, effectiveType } = useNetworkStatus();
  
  // No mostrar en localhost (desarrollo)
  const isLocalhost = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || 
     window.location.hostname === '127.0.0.1' ||
     window.location.hostname.startsWith('192.168.') ||
     window.location.hostname.startsWith('10.') ||
     window.location.hostname.startsWith('172.'));

  // No mostrar nada si todo está bien o estamos en localhost
  if ((isOnline && !isSlowConnection) || isLocalhost) {
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

