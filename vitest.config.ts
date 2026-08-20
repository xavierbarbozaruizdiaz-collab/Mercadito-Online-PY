import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node', // Cambiar a node para tests de servicios (no necesitan DOM)
    setupFiles: ['./tests/setup.ts'],
    exclude: [
      '**/node_modules/**',
      '**/e2e/**',
      '**/.next/**',
      '**/dist/**',
      '**/*.e2e.spec.ts',
      '**/*.e2e.test.ts',
      'tests/e2e.spec.ts',
      // HeroCarousel no se usa en home (HeroSlider); test DOM opcional
      'tests/unit/HeroCarousel.test.tsx',
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});

