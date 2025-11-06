'use client';

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import Image from 'next/image';

type Slide = {
  id: string;
  title: string;
  subtitle?: string;
  cta_primary_label?: string;
  cta_primary_href?: string;
  cta_secondary_label?: string;
  cta_secondary_href?: string;
  bg_type: 'gradient' | 'image';
  bg_gradient_from?: string;
  bg_gradient_to?: string;
  bg_image_url?: string;
};

type Stats = { products: number; stores: number; auctions: number };

export default function HeroCarousel({ slides, stats }: { slides: Slide[]; stats?: Stats }) {
  const prefersReduced = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const autoplay = useRef(Autoplay({ delay: 5000, stopOnMouseEnter: true }));
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, prefersReduced ? [] : [autoplay.current]);

  const onSelect = useCallback(() => {
    // noop for now, hook for analytics
  }, []);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', onSelect);
  }, [emblaApi, onSelect]);

  const slidesSafe = useMemo(() => (slides && slides.length > 0 ? slides : [
    {
      id: 'fallback',
      title: 'Mercadito Online PY',
      subtitle: 'Encuentra los mejores productos en Paraguay',
      cta_primary_label: 'Explorar',
      cta_primary_href: '/#products',
      cta_secondary_label: 'Vender',
      cta_secondary_href: '/dashboard',
      bg_type: 'gradient' as const,
      bg_gradient_from: '#14B8A6',
      bg_gradient_to: '#06B6D4',
    },
  ]), [slides]);

  return (
    <section role="region" aria-label="Destacados" className="relative">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {slidesSafe.map((s, idx) => (
            <div className="min-w-0 flex-[0_0_100%]" key={s.id}>
              <div
                className="w-full"
                style={{
                  background: s.bg_type === 'image'
                    ? undefined
                    : `linear-gradient(90deg, ${s.bg_gradient_from ?? '#14B8A6'}, ${s.bg_gradient_to ?? '#06B6D4'})`,
                }}
              >
                <div className="relative">
                  {s.bg_type === 'image' && s.bg_image_url && (
                    <Image src={s.bg_image_url} alt="" priority={idx === 0} width={1920} height={700} className="w-full h-[280px] sm:h-[420px] object-cover" />
                  )}
                  <div className="absolute inset-0 bg-black/10" aria-hidden="true" />
                  <div className="relative z-10 max-w-7xl mx-auto px-4 py-12 sm:py-16 text-white">
                    <h1 className="text-3xl sm:text-5xl font-extrabold drop-shadow-sm">{s.title}</h1>
                    {s.subtitle && (
                      <p className="mt-3 text-base sm:text-xl opacity-90 max-w-2xl">{s.subtitle}</p>
                    )}
                    <div className="mt-6 flex flex-col sm:flex-row gap-3">
                      {s.cta_primary_label && s.cta_primary_href && (
                        <a href={s.cta_primary_href} className="px-6 py-3 rounded-lg bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] font-semibold hover:opacity-95 transition-colors">
                          {s.cta_primary_label}
                        </a>
                      )}
                      {s.cta_secondary_label && s.cta_secondary_href && (
                        <a href={s.cta_secondary_href} className="px-6 py-3 rounded-lg border border-white/60 text-white font-semibold hover:bg-white/10 transition-colors">
                          {s.cta_secondary_label}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dots accesibles */}
      {/* Se pueden agregar en iteración posterior si se requiere interacción */}

      {/* Chips de stats */}
      <div className="max-w-7xl mx-auto px-4 -mt-6 sm:-mt-8 relative z-20">
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {['Productos', 'Tiendas', 'Subastas'].map((label, i) => (
            <div key={label} className="rounded-xl bg-white shadow-sm border p-3 sm:p-4 text-center">
              <div className="text-xs sm:text-sm text-gray-500">{label}</div>
              <div className="text-lg sm:text-2xl font-bold">
                {stats ? (i === 0 ? stats.products : i === 1 ? stats.stores : stats.auctions) : '—'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}



