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
    (window as any).__HERO_SLIDES__ = slides;
    console.log('[HERO/DIAG set]', Array.isArray(slides), slides?.length);
  }, [slides]);

  return null;
}

