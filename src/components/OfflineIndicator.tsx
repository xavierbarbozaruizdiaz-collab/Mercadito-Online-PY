// src/components/OfflineIndicator.tsx
// Componente para indicar estado offline

'use client';

import { useNetworkStatus } from '@/lib/hooks/useNetworkStatus';
import { WifiOff, Wifi, Gauge } from 'lucide-react';

export default function OfflineIndicator() {
  const { isOnline, isSlowConnection, effectiveType } = useNetworkStatus();

  if (isOnline && !isSlowConnection) {
    return null; // No mostrar nada si todo está bien
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

