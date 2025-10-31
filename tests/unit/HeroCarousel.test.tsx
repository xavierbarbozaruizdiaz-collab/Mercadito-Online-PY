import { render, screen } from '@testing-library/react';
import React from 'react';

// Import as default since component is default-exported or named? It exports default or named?
// We will import the path and use the named export fallback via require if needed
import HeroCarousel from '@/components/hero/HeroCarousel';

describe('HeroCarousel', () => {
  it('renders slide titles and stats chips', () => {
    const slides = [
      {
        id: '1',
        title: 'Título 1',
        subtitle: 'Sub 1',
        cta_primary_label: 'Explorar',
        cta_primary_href: '/#products',
        cta_secondary_label: 'Vender',
        cta_secondary_href: '/dashboard',
        bg_type: 'gradient',
        bg_gradient_from: '#14B8A6',
        bg_gradient_to: '#06B6D4',
        position: 0,
        is_active: true,
      },
    ] as any;

    const stats = { products: 10, stores: 5, auctions: 2 };

    render(<HeroCarousel slides={slides} stats={stats as any} />);

    expect(screen.getByText('Título 1')).toBeInTheDocument();
    expect(screen.getByText(/10/)).toBeInTheDocument();
    expect(screen.getByText(/5/)).toBeInTheDocument();
    expect(screen.getByText(/2/)).toBeInTheDocument();
  });
});


