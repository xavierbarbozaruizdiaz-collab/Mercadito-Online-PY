'use client';

// ============================================
// MERCADITO ONLINE PY - HERO SLIDER CLIENT
// Wrapper cliente para HeroSlider (requerido por Next.js 16)
// ============================================

import dynamic from 'next/dynamic';

// Tipo para los slides (debe coincidir con el de page.tsx)
type HeroSlide = {
  id: string;
  title: string | null;
  subtitle: string | null;
  cta_primary_label: string | null;
  cta_primary_href: string | null;
  cta_secondary_label: string | null;
  cta_secondary_href: string | null;
  bg_type: 'gradient' | 'image';
  bg_gradient_from?: string | null;
  bg_gradient_to?: string | null;
  bg_image_url?: string | null;
  image_url?: string | null;
  gradient_from?: string | null;
  gradient_to?: string | null;
  storage_path?: string | null;
  public_url?: string | null;
  sort_order: number;
  created_at?: string | null;
};

// Import dinámico sin SSR para evitar bloqueos en prod
const HeroSlider = dynamic(() => import('@/components/hero/HeroSlider'), {
  ssr: false,
});

interface HeroSliderClientProps {
  slides: HeroSlide[];
}

export default function HeroSliderClient({ slides }: HeroSliderClientProps) {
  if (!slides || slides.length === 0) {
    return null;
  }

  return <HeroSlider slides={slides} data-testid="hero-slider" />;
}








