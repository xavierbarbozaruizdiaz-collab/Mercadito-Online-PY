'use client';

import * as React from 'react';
import Image from 'next/image';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { useEffect, useCallback, useState, useMemo } from 'react';
import { cn } from '@/lib/utils';

export type HeroSlide = {
  id: string;
  title: string | null;
  subtitle: string | null;
  cta_primary_label: string | null;
  cta_primary_href: string | null;
  cta_secondary_label: string | null;
  cta_secondary_href: string | null;
  bg_type: 'image' | 'gradient';
  bg_gradient_from?: string | null;
  bg_gradient_to?: string | null;
  bg_image_url?: string | null;
  storage_path?: string | null;
  public_url?: string | null;
  position?: number;
  // Campos adicionales para compatibilidad
  image_url?: string | null;
  gradient_from?: string | null;
  gradient_to?: string | null;
  sort_order?: number;
};

type Props = React.HTMLAttributes<HTMLElement> & { slides: HeroSlide[] };

export default function HeroSlider({ slides, ...rest }: Props) {
  // Crear el plugin de autoplay solo si hay múltiples slides
  const autoplayPlugin = useMemo(() => {
    if (slides.length <= 1) return undefined;
    return Autoplay({ 
      delay: 5000,
      stopOnMouseEnter: true,
      stopOnInteraction: false,
    });
  }, [slides.length]);

  const [emblaRef, emblaApi] = useEmblaCarousel(
    { 
      loop: slides.length > 1,
      align: 'start',
      duration: 20,
      skipSnaps: false,
    },
    autoplayPlugin ? [autoplayPlugin] : undefined
  );
  
  const [index, setIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    
    // Configurar listeners
    emblaApi.on('select', onSelect);
    onSelect();
    
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  const scrollTo = (i: number) => emblaApi?.scrollTo(i);
  const prev = () => emblaApi?.scrollPrev();
  const next = () => emblaApi?.scrollNext();

  if (!slides?.length) return null;

  // Solo mostrar controles si hay más de un slide
  const hasMultipleSlides = slides.length > 1;

  return (
    <section 
      data-testid="hero-slider"
      className="relative w-full overflow-hidden"
      aria-label="Promociones destacadas"
      {...rest}
    >
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex touch-pan-y">
          {slides.map((s, i) => {
            // Determinar el tipo de fondo y URL
            const bgType = s.bg_type || 'gradient';
            const bgImageUrl = s.bg_image_url || s.image_url || s.public_url;
            const gradientFrom = s.bg_gradient_from || s.gradient_from || '#6d28d9';
            const gradientTo = s.bg_gradient_to || s.gradient_to || '#2563eb';

            return (
              <div className="relative flex-[0_0_100%]" key={s.id || i}>
                <div className="relative w-full min-h-[220px] md:min-h-[340px] lg:min-h-[420px] xl:min-h-[520px]">
                  {bgType === 'image' && bgImageUrl ? (
                    <Image
                      src={bgImageUrl}
                      alt={s.title ?? 'Promoción'}
                      fill
                      priority={i === 0}
                      sizes="100vw"
                      className="object-cover"
                    />
                  ) : (
                    <div 
                      className="h-full w-full"
                      style={{
                        background: `linear-gradient(90deg, ${gradientFrom}, ${gradientTo})`
                      }}
                    />
                  )}

                  {(s.title || s.subtitle || s.cta_primary_label || s.cta_secondary_label) && (
                    <div className="absolute inset-0 bg-black/20">
                      <div className="mx-auto max-w-6xl px-4 h-full flex flex-col items-start justify-center text-white">
                        {s.title && (
                          <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold drop-shadow-lg">
                            {s.title}
                          </h1>
                        )}
                        {s.subtitle && (
                          <p className="mt-2 md:mt-4 text-base md:text-lg lg:text-xl opacity-90 max-w-2xl">
                            {s.subtitle}
                          </p>
                        )}
                        <div className="mt-4 md:mt-6 flex flex-col sm:flex-row gap-3">
                          {s.cta_primary_label && s.cta_primary_href && (
                            <a
                              href={s.cta_primary_href}
                              className="inline-flex items-center justify-center rounded-lg px-6 py-3 bg-white text-blue-600 font-semibold hover:bg-gray-100 transition-colors shadow-lg"
                              data-testid="primary-btn"
                            >
                              {s.cta_primary_label}
                            </a>
                          )}
                          {s.cta_secondary_label && s.cta_secondary_href && (
                            <a
                              href={s.cta_secondary_href}
                              className="inline-flex items-center justify-center rounded-lg px-6 py-3 bg-transparent border-2 border-white text-white font-semibold hover:bg-white/10 transition-colors"
                            >
                              {s.cta_secondary_label}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Botones prev/next siempre visibles si hay múltiples slides */}
      {hasMultipleSlides && (
        <>
          <button
            onClick={prev}
            aria-label="Anterior"
            className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 z-50 inline-flex items-center justify-center rounded-full w-8 h-8 sm:w-10 sm:h-10 bg-white/20 hover:bg-white/90 active:bg-white text-white hover:text-gray-900 shadow-md hover:shadow-lg transition-all"
          >
            <svg width="16" height="16" className="sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 19L8 12L15 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button
            onClick={next}
            aria-label="Siguiente"
            className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 z-50 inline-flex items-center justify-center rounded-full w-8 h-8 sm:w-10 sm:h-10 bg-white/20 hover:bg-white/90 active:bg-white text-white hover:text-gray-900 shadow-md hover:shadow-lg transition-all"
          >
            <svg width="16" height="16" className="sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 5L16 12L9 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </>
      )}

      {/* Indicadores de slides */}
      {hasMultipleSlides && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => scrollTo(i)}
              aria-label={`Ir al slide ${i + 1}`}
              aria-current={i === index}
              className={cn(
                'h-2 w-2 rounded-full bg-white/50 hover:bg-white transition-all',
                i === index && 'bg-white w-6'
              )}
            />
          ))}
        </div>
      )}
    </section>
  );
}

