# 🔐 EJECUTAR MIGRACIÓN DE SEGURIDAD - INSTRUCCIONES

## ✅ Commit y Push Completados

Los cambios han sido commiteados y pusheados exitosamente al repositorio.

## 📋 PASO CRÍTICO: Ejecutar Migración SQL

**IMPORTANTE:** Debes ejecutar la migración SQL manualmente en Supabase Dashboard.

### Opción 1: Supabase Dashboard (RECOMENDADO)

1. **Abre Supabase Dashboard:**
   ```
   https://supabase.com/dashboard/project/hqdatzhliaordlsqtjea/sql/new
   ```

2. **Abre el archivo:**
   ```
   supabase/migrations/20250130000004_auction_security_enhancements.sql
   ```

3. **Copia TODO el contenido** del archivo y pégalo en el SQL Editor

4. **Haz clic en "Run"** o presiona `Ctrl+Enter`

5. **Verifica que no haya errores** - deberías ver "Success. No rows returned"

### Opción 2: Supabase CLI (si está configurado)

```bash
# Si tienes Supabase CLI instalado y vinculado:
supabase db push

# O aplicar migración específica:
supabase migration up 20250130000004_auction_security_enhancements
```

## 🎯 ¿Qué hace esta migración?

1. ✅ **Agrega versionado** (`auction_version`) a productos
2. ✅ **Agrega idempotency key** a `auction_bids`
3. ✅ **Crea tabla de auditoría** `auction_events`
4. ✅ **Mejora función `place_bid`** con:
   - Rate limiting (1 puja/segundo)
   - Lock transaccional (SELECT FOR UPDATE)
   - Validación de timestamps
   - Retorna JSONB con más información

## ⚠️ ADVERTENCIAS

- Esta migración **modifica la función `place_bid`** existente
- Si hay subastas activas, se verán afectadas
- La nueva función es **retrocompatible** con el frontend

## ✅ Verificación Post-Migración

Después de ejecutar, verifica que:

```sql
-- Verificar que auction_version existe
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'products' AND column_name = 'auction_version';

-- Verificar tabla de auditoría
SELECT COUNT(*) FROM auction_events;

-- Verificar función mejorada
SELECT proname FROM pg_proc WHERE proname = 'place_bid';
```

## 📝 Próximo Paso

Después de ejecutar la migración, el sistema estará protegido con:
- ✅ Rate limiting activo
- ✅ Locks transaccionales
- ✅ Versionado funcionando
- ✅ Auditoría completa

**Nota:** También debes configurar el scheduler automático (ver `20250130000005_setup_scheduler.sql`)

