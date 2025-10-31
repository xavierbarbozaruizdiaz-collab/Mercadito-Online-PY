# 🎯 CONFIGURACIÓN DEL SISTEMA DE SUBASTAS
## Mercadito Online PY

---

## ✅ INSTALACIÓN

### 1. Aplicar Migraciones de Base de Datos

```bash
npx supabase db push
```

Esto creará:
- Tabla `auction_bids`
- Columnas en `products` para subastas
- Funciones SQL necesarias
- RLS Policies

### 2. Verificar Variables de Entorno

Asegúrate de tener configurado:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (opcional, para Edge Functions)

---

## 🔄 AUTO-CIERRE DE SUBASTAS

El sistema necesita ejecutar periódicamente dos funciones:
1. `close_expired_auctions()` - Cierra subastas que han expirado
2. `activate_scheduled_auctions()` - Activa subastas programadas

### Opción A: API Endpoint (Recomendado para desarrollo)

Ya está creado en: `/api/auctions/close-expired`

**Configurar cron job externo** (ej: cron-job.org, EasyCron):

```
URL: https://tu-dominio.com/api/auctions/close-expired
Método: POST
Headers: X-API-Key: tu-api-key (opcional)
Frecuencia: Cada 1 minuto
```

**Para testing manual:**
```bash
curl -X POST https://tu-dominio.com/api/auctions/close-expired
```

### Opción B: Supabase Edge Function (Recomendado para producción)

1. **Desplegar Edge Function:**

```bash
# Desde la raíz del proyecto
supabase functions deploy close-auctions
```

2. **Configurar Supabase Cron (pg_cron):**

En el SQL Editor de Supabase, ejecutar:

```sql
-- Crear función para llamar a la Edge Function
CREATE OR REPLACE FUNCTION public.call_close_auctions_edge_function()
RETURNS void AS $$
DECLARE
  response text;
BEGIN
  -- Llamar a la Edge Function
  PERFORM
    net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/close-auctions',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
        'Content-Type', 'application/json'
      )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Programar ejecución cada minuto (requiere extensión pg_cron)
SELECT cron.schedule(
  'close-expired-auctions',
  '* * * * *', -- Cada minuto
  $$SELECT public.call_close_auctions_edge_function();$$
);
```

**Nota:** pg_cron requiere activación en Supabase. Contacta al equipo de Supabase si no está disponible.

### Opción C: Servidor Node.js/Cron interno

Crear un script `scripts/auction-cron.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';
import cron from 'node-cron';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Ejecutar cada minuto
cron.schedule('* * * * *', async () => {
  console.log('🔍 Checking expired auctions...');
  
  const { data: closed, error: closeErr } = await supabase.rpc('close_expired_auctions');
  const { data: activated, error: activateErr } = await supabase.rpc('activate_scheduled_auctions');
  
  if (closeErr) console.error('Error closing:', closeErr);
  if (activateErr) console.error('Error activating:', activateErr);
  
  console.log(`✅ Closed: ${closed}, Activated: ${activated}`);
});
```

Ejecutar: `tsx scripts/auction-cron.ts`

---

## 📋 FUNCIONALIDADES IMPLEMENTADAS

### ✅ Completadas:
- ✅ Sistema de pujas en tiempo real
- ✅ Timer con anti-sniping visual
- ✅ Validación de incrementos mínimos
- ✅ Compra ahora (Buy Now)
- ✅ Notificaciones (en BD)
- ✅ Historial de pujas
- ✅ Páginas principales (`/auctions`, `/auctions/[id]`)
- ✅ Mis Pujas (`/dashboard/my-bids`)
- ✅ Hook `useAuction` para simplificar código

### ⚠️ Requiere Configuración:
- ⚠️ Auto-cierre automático (función SQL lista, requiere cron)
- ⚠️ Activación automática (función SQL lista, requiere cron)

---

## 🧪 TESTING

### 1. Crear una Subasta de Prueba

1. Ir a `/dashboard/new-product`
2. Seleccionar "Subasta" como tipo de venta
3. Configurar:
   - Precio base: 10,000 Gs.
   - Precio compra ahora (opcional): 50,000 Gs.
   - Fecha de inicio: Ahora o en el futuro
4. Guardar

### 2. Ver Subasta Activa

- Ir a `/auctions` - Debe aparecer en la lista
- Hacer clic para ver detalles en `/auctions/[id]`

### 3. Pujar

- Ingresar monto (mínimo: precio actual + incremento)
- Confirmar puja
- Ver actualización en tiempo real

### 4. Ver Mis Pujas

- Ir a `/dashboard/my-bids`
- Ver todas las pujas con estados

### 5. Probar Auto-cierre

**Opción manual:**
```sql
SELECT public.close_expired_auctions();
```

**Opción API:**
```bash
curl -X POST http://localhost:3000/api/auctions/close-expired
```

---

## 📊 ESTRUCTURA DE DATOS

### Tabla `auction_bids`
```sql
- id (UUID)
- product_id (UUID)
- bidder_id (UUID)
- amount (DECIMAL)
- bid_time (TIMESTAMPTZ)
- is_auto_bid (BOOLEAN)
- max_auto_bid (DECIMAL)
- is_retracted (BOOLEAN)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

### Columnas en `products` (subastas)
```sql
- auction_start_at (TIMESTAMPTZ)
- auction_end_at (TIMESTAMPTZ)
- auction_status (TEXT): 'scheduled' | 'active' | 'ended' | 'cancelled'
- current_bid (DECIMAL)
- min_bid_increment (DECIMAL)
- buy_now_price (DECIMAL)
- reserve_price (DECIMAL)
- winner_id (UUID)
- total_bids (INTEGER)
- auto_extend_seconds (INTEGER)
```

---

## 🔔 NOTIFICACIONES

Las notificaciones se crean automáticamente en la tabla `notifications`:

1. **Nueva puja recibida** (vendedor)
2. **Puja superada** (postor anterior)
3. **Ganaste la subasta** (ganador)
4. **Perdiste la subasta** (otros postores)
5. **Subasta finalizada sin ganador** (vendedor)
6. **Compra ahora realizada** (todos)

---

## 🚀 PRÓXIMAS MEJORAS (Opcionales)

- [ ] Auto-bid (puja automática con límite máximo)
- [ ] Watchlist de subastas
- [ ] Alertas de precio
- [ ] Historial de subastas del vendedor mejorado
- [ ] Analytics de subastas
- [ ] Email notifications
- [ ] Push notifications
- [ ] Integración con sistema de pagos

---

## 📝 NOTAS IMPORTANTES

1. **Anti-sniping:** Cada nueva puja extiende el tiempo en `auto_extend_seconds` (default: 10s) si quedan menos de ese tiempo.

2. **Incrementos mínimos:**
   - < 10,000 Gs.: 1,000 Gs.
   - < 50,000 Gs.: 5,000 Gs.
   - < 100,000 Gs.: 10,000 Gs.
   - >= 100,000 Gs.: 10% del precio actual

3. **Precio de reserva:** Si una subasta tiene `reserve_price` y no se alcanza, el vendedor será notificado pero no se asignará ganador automáticamente.

4. **Compra ahora:** Cierra la subasta inmediatamente y crea una orden (se debe completar el flujo de creación de orden después).

---

**¿Preguntas o problemas?** Revisa los logs en Supabase Dashboard → Logs → Postgres Logs

