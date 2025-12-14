'use client';

import * as React from 'react';
import Image from 'next/image';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { useEffect, useCallback, useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { HeroSlide as HeroSlideType } from '@/types/hero';

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
  link_url?: string | null;
  show_title?: boolean | null;
  position: number;
};

type Props = React.HTMLAttributes<HTMLElement> & { slides: any[] };

export default function HeroSlider({ slides, ...rest }: Props) {
  // Crear el plugin de autoplay solo si hay múltiples slides
  const autoplayPlugin = useMemo(() => {
    if (slides.length <= 1) return undefined;
    return Autoplay({ 
      delay: 3000,
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

  // Log cuando se montan los botones Hero CTA
  useEffect(() => {
    if (slides?.length > 0) {
      console.log('[BTN] Hero CTA buttons mounted');
    }
  }, [slides?.length]);

  // Pre-cargar todas las imágenes del slider para evitar desaparición al deslizar
  useEffect(() => {
    if (!slides?.length) return;

    const imageUrls: string[] = [];
    slides.forEach((s) => {
      if (s.bg_type === 'image') {
        const url = s.bg_image_url || s.public_url || (s as any).image_url;
        if (url) {
          imageUrls.push(url as string);
        }
      }
    });

    // Pre-cargar todas las imágenes
    imageUrls.forEach((url) => {
      const img = new window.Image();
      img.src = url;
    });
  }, [slides]);

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
            const imageUrl = s.bg_image_url || s.public_url || (s as any).image_url;
            const slideContent = (
              <div className="relative flex-[0_0_100%]" key={s.id}>
                <div className="relative w-full min-h-[220px] md:min-h-[340px] lg:min-h-[420px] xl:min-h-[520px]">
                  {s.bg_type === 'image' && imageUrl ? (
                    <Image
                      src={imageUrl as string}
                      alt={s.title ?? 'Promoción'}
                      fill
                      priority={i < 3} // Pre-cargar las primeras 3 imágenes
                      sizes="100vw"
                      className="object-cover"
                      // Deshabilitar optimización para URLs de Supabase para evitar 404
                      // El loader personalizado maneja estas URLs directamente
                      unoptimized={typeof imageUrl === 'string' && imageUrl.includes('supabase.co/storage')}
                      onError={(e) => {
                        console.error('[HeroSlider] Error loading image:', imageUrl);
                        // Fallback a gradiente si falla la carga
                        const target = e.target as HTMLImageElement;
                        if (target.parentElement) {
                          target.style.display = 'none';
                        }
                      }}
                      onLoad={() => {
                        // Forzar re-render del carrusel cuando la imagen carga
                        if (emblaApi) {
                          emblaApi.reInit();
                        }
                      }}
                    />
                  ) : (
                    <div 
                      className="h-full w-full"
                      style={{
                        background: s.bg_gradient_from && s.bg_gradient_to
                          ? `linear-gradient(90deg, ${s.bg_gradient_from}, ${s.bg_gradient_to})`
                          : (s as any).gradient_from && (s as any).gradient_to
                          ? `linear-gradient(90deg, ${(s as any).gradient_from}, ${(s as any).gradient_to})`
                          : 'linear-gradient(90deg, #14B8A6, #06B6D4)'
                      }}
                    />
                  )}

                  {(s.show_title !== false && (s.title || s.subtitle)) || s.cta_primary_label || s.cta_secondary_label ? (
                    <div className="absolute inset-0 bg-black/20">
                      <div className="mx-auto max-w-6xl px-4 h-full flex flex-col items-center justify-center text-center text-white">
                        {s.show_title !== false && s.title && (
                          <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold drop-shadow">
                            {s.title}
                          </h1>
                        )}
                        {s.subtitle && (
                          <p className="mt-2 text-sm md:text-base opacity-90">{s.subtitle}</p>
                        )}
                        {(s.cta_primary_label || s.cta_secondary_label) && (
                          <div className="mt-4 flex flex-col sm:flex-row gap-3 items-center justify-center">
                            {s.cta_primary_label && s.cta_primary_href && (
                              <a
                                href={s.cta_primary_href}
                                onClick={(e) => {
                                  if (s.link_url) {
                                    e.stopPropagation();
                                  }
                                }}
                                className="inline-flex items-center justify-center rounded-lg px-5 py-2.5 bg-white/20 backdrop-blur-sm border border-white/30 text-white hover:bg-white/30 transition-colors text-sm sm:text-base font-medium"
                                data-testid="primary-btn"
                              >
                                {s.cta_primary_label}
                              </a>
                            )}
                            {s.cta_secondary_label && s.cta_secondary_href && (
                              <a
                                href={s.cta_secondary_href}
                                onClick={(e) => {
                                  if (s.link_url) {
                                    e.stopPropagation();
                                  }
                                }}
                                className="inline-flex items-center justify-center rounded-lg px-5 py-2.5 bg-white/20 backdrop-blur-sm border border-white/30 text-white hover:bg-white/30 transition-colors text-sm sm:text-base font-medium"
                                data-testid="secondary-btn"
                              >
                                {s.cta_secondary_label}
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            );

            // Si hay link_url, envolver todo el slide en un link
            if (s.link_url) {
              return (
                <a
                  key={s.id}
                  href={s.link_url}
                  className="block relative flex-[0_0_100%]"
                  onClick={(e) => {
                    // Si hay CTAs, permitir que funcionen sin activar el link del slide
                    const target = e.target as HTMLElement;
                    if (target.closest('a[data-testid]')) {
                      e.stopPropagation();
                    }
                  }}
                >
                  {slideContent}
                </a>
              );
            }

            return slideContent;
          })}
        </div>
      </div>

      {/* Botones prev/next siempre visibles */}
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









