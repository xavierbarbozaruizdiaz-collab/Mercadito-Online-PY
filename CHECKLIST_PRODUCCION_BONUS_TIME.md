# ✅ Checklist: Cambios para Producción - Bonus Time Mejorado

## 📋 Estado Actual

### ✅ Cambios Completados

1. **Migración SQL** (`20250202000011_centralize_bonus_time_config.sql`)
   - ✅ Creada y lista para ejecutar
   - ⚠️ **PENDIENTE**: Ejecutar en producción (Supabase SQL Editor)

2. **Función `place_bid()` actualizada**
   - ✅ Script de creación: `CREAR_PLACE_BID_FINAL.sql`
   - ⚠️ **PENDIENTE**: Verificar que se ejecutó correctamente en producción

3. **Backend - Endpoint `/api/auctions/[id]/bid`**
   - ✅ Código actualizado con información de bonus time
   - ✅ Archivo: `src/app/api/auctions/[id]/bid/route.ts`
   - ⚠️ **PENDIENTE**: Deploy a producción

4. **Frontend - Hook `useAuction`**
   - ✅ Código actualizado para reaccionar a bonus time
   - ✅ Archivo: `src/lib/hooks/useAuction.ts`
   - ⚠️ **PENDIENTE**: Deploy a producción

5. **Frontend - Página de subasta**
   - ✅ Notificaciones mejoradas para bonus time
   - ✅ Archivo: `src/app/auctions/[id]/page.tsx`
   - ⚠️ **PENDIENTE**: Deploy a producción

6. **Configuración Next.js - Imágenes**
   - ✅ `next.config.ts` actualizado con dominios de Supabase
   - ⚠️ **PENDIENTE**: Deploy a producción

---

## 🚀 Pasos para Producción

### Paso 1: Ejecutar Migración SQL en Producción

1. Abre Supabase Dashboard → SQL Editor (producción)
2. Ejecuta: `supabase/migrations/20250202000011_centralize_bonus_time_config.sql`
3. Verifica que se ejecutó correctamente:
   ```sql
   SELECT * FROM public.auction_bonus_config WHERE id = 'default';
   SELECT proname FROM pg_proc WHERE proname = 'get_bonus_time_config';
   ```

### Paso 2: Verificar/Crear `place_bid()` en Producción

1. Ejecuta: `CREAR_PLACE_BID_FINAL.sql` en Supabase SQL Editor
2. Verifica que solo hay una versión correcta:
   ```sql
   SELECT 
     proname as function_name,
     CASE 
       WHEN prosrc LIKE '%get_bonus_time_config%' THEN '✅ Usa configuración centralizada'
       ELSE '❌ NO usa configuración centralizada'
     END as uses_centralized_config,
     CASE 
       WHEN prosrc LIKE '%bonus_applied%' THEN '✅ Retorna información de bonus'
       ELSE '❌ NO retorna información de bonus'
     END as returns_bonus_info
   FROM pg_proc
   WHERE proname = 'place_bid';
   ```
   Debe retornar **1 sola fila** con ambos checks en verde ✅

### Paso 3: Deploy de Código a Producción

1. **Commit y Push** de los cambios:
   ```bash
   git add .
   git commit -m "feat: Mejoras bonus time (Opción A) + fix imágenes"
   git push origin main
   ```

2. **Verificar que se deployó**:
   - Backend: `/api/auctions/[id]/bid` retorna `bonus_applied`, `bonus_new_end_time`
   - Frontend: Las miniaturas de imágenes cargan correctamente
   - Frontend: El timer se actualiza cuando se aplica bonus time

---

## ✅ Verificación Post-Deploy

### Backend
- [ ] Endpoint `/api/auctions/[id]/bid` retorna información de bonus time
- [ ] Tabla `auction_bonus_config` existe con valores por defecto
- [ ] Función `get_bonus_time_config()` existe y funciona
- [ ] Función `place_bid()` tiene solo una versión con nueva lógica

### Frontend
- [ ] Las miniaturas de imágenes cargan correctamente (sin errores 400)
- [ ] El timer se actualiza cuando se aplica bonus time
- [ ] Las notificaciones muestran mensajes claros sobre bonus time
- [ ] No hay errores en la consola del navegador

### Funcionalidad
- [ ] Bonus time se activa cuando alguien puja en los últimos 10 segundos
- [ ] La subasta se extiende correctamente
- [ ] Los límites (máximo extensiones, duración máxima) funcionan
- [ ] El frontend muestra el nuevo tiempo inmediatamente

---

## 📝 Archivos Modificados (Lista para Deploy)

### Backend
- ✅ `src/app/api/auctions/[id]/bid/route.ts`
- ✅ `src/lib/services/auctionService.ts`

### Frontend
- ✅ `src/lib/hooks/useAuction.ts`
- ✅ `src/app/auctions/[id]/page.tsx`
- ✅ `src/components/auction/AuctionCard.tsx` (ya estaba actualizado)

### Configuración
- ✅ `next.config.ts` (dominios de Supabase para imágenes)

### SQL (Ejecutar en Supabase)
- ✅ `supabase/migrations/20250202000011_centralize_bonus_time_config.sql`
- ✅ `CREAR_PLACE_BID_FINAL.sql` (si es necesario recrear la función)

---

## ⚠️ Importante

1. **Migración SQL**: Debe ejecutarse ANTES del deploy del código
2. **Verificación**: Después del deploy, verificar que todo funciona correctamente
3. **Rollback**: Si algo falla, los scripts de rollback están en los archivos de documentación

---

**Última actualización**: 2024






