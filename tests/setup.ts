import '@testing-library/jest-dom';
import React from 'react';
import { vi } from 'vitest';

// Env mínima para tests (sin secrets reales hardcodeados en src/)
process.env.NEXT_PUBLIC_SUPABASE_URL ||= 'https://example.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||= 'test-anon-key';
process.env.NEXT_PUBLIC_FEATURE_HERO ||= 'true';
process.env.NEXT_PUBLIC_APP_URL ||= 'http://localhost:3000';

// Mock next/image to behave like a normal img in tests
vi.mock('next/image', () => ({
  default: (props: any) => {
     
    return React.createElement('img', props);
  },
}));

// Mock embla carousel libs to avoid DOM APIs in tests
vi.mock('embla-carousel-react', () => ({
  useEmblaCarousel: () => [vi.fn(), {
    scrollTo: vi.fn(),
    canScrollPrev: () => false,
    canScrollNext: () => false,
  }],
}));

vi.mock('embla-carousel-autoplay', () => ({
  default: () => ({ stop: () => undefined, play: () => undefined }),
}));


