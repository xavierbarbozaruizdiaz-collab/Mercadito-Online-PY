import { describe, it, expect } from 'vitest';
import { computeLandedPricePyg } from '@/lib/services/sourcedCatalogService';

describe('computeLandedPricePyg', () => {
  it('aplica fx, markup, buffer y redondea a 1000 Gs', () => {
    const price = computeLandedPricePyg({
      sourcePrice: 10,
      sourceShipping: 2,
      fx: 7800,
      markupPercent: 35,
      bufferPercent: 10,
    });
    // (10+2)*7800*1.35*1.10 = 138996 → ceil to 139000
    expect(price).toBe(139000);
  });

  it('nunca devuelve 0 o negativo', () => {
    expect(
      computeLandedPricePyg({
        sourcePrice: 0,
        sourceShipping: 0,
        fx: 7800,
        markupPercent: 35,
        bufferPercent: 10,
      })
    ).toBe(1000);
  });
});
