-- ============================================
-- Sincronizar nombres de tiendas con nombres de perfil
-- ============================================

-- Actualizar todas las tiendas activas para que su nombre coincida con el nombre del perfil
UPDATE stores s
SET name = COALESCE(
  TRIM(CONCAT(p.first_name, ' ', p.last_name)),
  SUBSTRING(p.email FROM '^[^@]+'),
  'Tienda'
),
slug = LOWER(REGEXP_REPLACE(
  REGEXP_REPLACE(
    COALESCE(
      TRIM(CONCAT(p.first_name, ' ', p.last_name)),
      SUBSTRING(p.email FROM '^[^@]+'),
      'tienda'
    ),
    '[àáâãäå]', 'a', 'gi'
  ),
  '[^a-z0-9]+', '-', 'g'
))
FROM profiles p
WHERE s.seller_id = p.id
  AND s.is_active = true
  AND (
    -- Solo actualizar si el nombre de la tienda es diferente al nombre del perfil
    s.name != COALESCE(TRIM(CONCAT(p.first_name, ' ', p.last_name)), SUBSTRING(p.email FROM '^[^@]+'), 'Tienda')
    OR s.name IS NULL
  );

