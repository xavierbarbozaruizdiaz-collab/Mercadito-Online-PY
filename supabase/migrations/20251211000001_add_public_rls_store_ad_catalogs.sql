-- ============================================
-- Agregar políticas RLS públicas para feeds de catálogos
-- Permite acceso público a catálogos activos para feeds (Facebook, TikTok, etc.)
-- ============================================

-- Política pública para ver catálogos activos (para feeds)
DROP POLICY IF EXISTS "Public can view active catalogs" ON public.store_ad_catalogs;
CREATE POLICY "Public can view active catalogs" ON public.store_ad_catalogs
  FOR SELECT
  TO public
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = store_ad_catalogs.store_id
      AND stores.is_active = true
    )
  );

-- Política pública para ver productos de catálogos activos (para feeds)
DROP POLICY IF EXISTS "Public can view active catalog products" ON public.store_ad_catalog_products;
CREATE POLICY "Public can view active catalog products" ON public.store_ad_catalog_products
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.store_ad_catalogs
      WHERE store_ad_catalogs.id = store_ad_catalog_products.catalog_id
      AND store_ad_catalogs.is_active = true
      AND EXISTS (
        SELECT 1 FROM public.stores
        WHERE stores.id = store_ad_catalogs.store_id
        AND stores.is_active = true
      )
    )
  );



