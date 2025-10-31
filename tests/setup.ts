import '@testing-library/jest-dom';
import React from 'react';
import { vi } from 'vitest';

// Mock next/image to behave like a normal img in tests
vi.mock('next/image', () => ({
  default: (props: any) => {
    // eslint-disable-next-line jsx-a11y/alt-text
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


