'use client';

import { useUserActivity } from '@/lib/hooks/useUserActivity';

/**
 * Componente para rastrear actividad del usuario
 * Debe incluirse en el layout principal
 */
export default function UserActivityTracker() {
  useUserActivity();
  return null;
}

