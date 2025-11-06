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

  // OCULTAR COMPLETAMENTE - Es demasiado molesto y no es necesario
  return null;
}

