# ⚡ COMANDOS RÁPIDOS PARA PRUEBA

## 1. Verificar Migraciones

```bash
# Ver estado de migraciones
npm run db:status
```

## 2. Verificar Código

```bash
# TypeScript
npm run typecheck

# Linting
npm run lint
```

## 3. Iniciar Desarrollo

```bash
# Servidor de desarrollo
npm run dev
```

## 4. URLs de Prueba

- **Marketing Principal:** http://localhost:3000/dashboard/marketing
- **Catálogos de Anuncios:** http://localhost:3000/dashboard/marketing/catalogos-anuncios
- **Catálogo Mercadito:** http://localhost:3000/dashboard/marketing/catalogo-mercadito

## 5. Verificar en Supabase

```sql
-- Ver catálogos creados
SELECT * FROM store_ad_catalogs ORDER BY created_at DESC;

-- Ver productos en catálogos
SELECT * FROM store_ad_catalog_products ORDER BY created_at DESC;

-- Ver productos de una tienda
SELECT id, title, price, status FROM products WHERE store_id = 'TU_STORE_ID';
```

## 6. Limpiar Datos de Prueba (Opcional)

```sql
-- Eliminar catálogos de prueba (CUIDADO: elimina todos los catálogos)
DELETE FROM store_ad_catalog_products;
DELETE FROM store_ad_catalogs;
```


