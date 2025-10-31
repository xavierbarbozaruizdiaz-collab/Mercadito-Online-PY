// ============================================
// MERCADITO ONLINE PY - USE USER ACTIVITY HOOK
// Hook para actualizar last_seen periódicamente
// ============================================

import { useEffect } from 'react';
import { updateLastSeen } from '@/lib/services/userService';

/**
 * Hook para actualizar la actividad del usuario cada minuto
 */
export function useUserActivity() {
  useEffect(() => {
    // Actualizar inmediatamente
    updateLastSeen();

    // Actualizar cada minuto
    const interval = setInterval(() => {
      updateLastSeen();
    }, 60000); // 1 minuto

    // Actualizar al hacer focus en la ventana
    const handleFocus = () => {
      updateLastSeen();
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);
}

