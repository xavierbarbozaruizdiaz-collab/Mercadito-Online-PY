// ============================================
// MERCADITO ONLINE PY - PRODUCT SERVICE TESTS
// Tests básicos para el servicio de productos
// ============================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Importación dinámica para evitar problemas con aliases
let productService: any;

// Mock de Supabase
vi.mock('../../src/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
        order: vi.fn(() => ({
          range: vi.fn(),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(),
          })),
        })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(),
      })),
    })),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        getPublicUrl: vi.fn(),
        remove: vi.fn(),
      })),
    },
  },
}));

describe('ProductService', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Importar dinámicamente para evitar problemas con path aliases
    const module = await import('../../src/lib/services/productService');
    productService = module.productService || module.default;
  });

  describe('getProduct', () => {
    it('should return null when product not found', async () => {
      const { supabase } = await import('../../src/lib/supabase/client');
      const mockQuery = {
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116' },
          }),
        })),
      };
      
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue(mockQuery),
      });

      const result = await productService.getProduct('non-existent-id');
      expect(result).toBeNull();
    });

    it('should return product when found', async () => {
      const { supabase } = await import('../../src/lib/supabase/client');
      const mockProduct = {
        id: 'product-1',
        title: 'Test Product',
        price: 100,
      };

      const mockQuery = {
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: mockProduct,
            error: null,
          }),
        })),
      };
      
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue(mockQuery),
      });

      const result = await productService.getProduct('product-1');
      expect(result).toEqual(mockProduct);
    });
  });

  describe('getProducts', () => {
    it('should return paginated products', async () => {
      const { supabase } = await import('../../src/lib/supabase/client');
      const mockProducts = [
        { id: '1', title: 'Product 1' },
        { id: '2', title: 'Product 2' },
      ];

      const mockQuery = {
        or: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        overlaps: vi.fn().mockReturnThis(),
        order: vi.fn(() => ({
          range: vi.fn().mockResolvedValue({
            data: mockProducts,
            error: null,
            count: 2,
          }),
        })),
      };
      
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue(mockQuery),
      });

      const result = await productService.getProducts({ page: 1, limit: 20 });
      
      expect(result.data).toEqual(mockProducts);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
    });

    it('should validate pagination limits', async () => {
      const { supabase } = await import('../../src/lib/supabase/client');
      const mockQuery = {
        order: vi.fn(() => ({
          range: vi.fn().mockResolvedValue({
            data: [],
            error: null,
            count: 0,
          }),
        })),
      };
      
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue(mockQuery),
      });

      // Intentar con límite mayor al máximo (60)
      const result = await productService.getProducts({ page: 1, limit: 100 });
      
      // Debería limitarse a 60
      expect(result.pagination.limit).toBeLessThanOrEqual(60);
    });
  });

  describe('Validation', () => {
    it('should handle invalid page numbers', async () => {
      const { supabase } = await import('../../src/lib/supabase/client');
      const mockQuery = {
        order: vi.fn(() => ({
          range: vi.fn().mockResolvedValue({
            data: [],
            error: null,
            count: 0,
          }),
        })),
      };
      
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue(mockQuery),
      });

      // Página negativa debería convertirse a 1
      const result = await productService.getProducts({ page: -1 });
      expect(result.pagination.page).toBe(1);
    });
  });
});

