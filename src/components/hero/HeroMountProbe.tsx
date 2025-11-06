// ============================================
// MERCADITO ONLINE PY - HERO MOUNT PROBE
// Componente cliente para asegurar la asignación de slides a window
// ============================================

'use client';

import { useEffect } from 'react';

interface HeroMountProbeProps {
  slides: any[];
}

export default function HeroMountProbe({ slides }: HeroMountProbeProps) {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__HERO_SLIDES__ = slides;
      if (process.env.NODE_ENV === 'development') {
        console.log('[HERO/DIAG set]', Array.isArray(slides), slides?.length);
      }
    }
  }, [slides]);

  return null;
}

