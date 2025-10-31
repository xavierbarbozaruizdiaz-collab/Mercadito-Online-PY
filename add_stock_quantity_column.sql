-- ============================================
-- AGREGAR COLUMNA stock_quantity A PRODUCTS
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- Verificar si la columna stock_quantity existe y agregarla si no
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'products' 
        AND column_name = 'stock_quantity'
    ) THEN
        ALTER TABLE public.products 
        ADD COLUMN stock_quantity INTEGER DEFAULT 9999 NOT NULL;
        
        -- Actualizar productos existentes sin stock a un valor por defecto
        UPDATE public.products 
        SET stock_quantity = 9999 
        WHERE stock_quantity IS NULL;
        
        RAISE NOTICE '✅ Columna stock_quantity agregada a products';
    ELSE
        RAISE NOTICE '✅ La columna stock_quantity ya existe';
    END IF;
END $$;

-- Asegurar que stock_quantity no sea NULL
ALTER TABLE public.products 
ALTER COLUMN stock_quantity SET DEFAULT 9999,
ALTER COLUMN stock_quantity SET NOT NULL;

-- Actualizar cualquier valor NULL restante
UPDATE public.products 
SET stock_quantity = COALESCE(stock_quantity, 9999)
WHERE stock_quantity IS NULL;

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════';
    RAISE NOTICE '✅ COLUMNA stock_quantity VERIFICADA/CREADA';
    RAISE NOTICE '   - Todos los productos ahora tienen stock_quantity';
    RAISE NOTICE '   - Valor por defecto: 9999 (inventario ilimitado)';
    RAISE NOTICE '';
    RAISE NOTICE '💡 Los vendedores pueden actualizar el stock desde el dashboard';
    RAISE NOTICE '═══════════════════════════════════════════════════════';
END $$;

