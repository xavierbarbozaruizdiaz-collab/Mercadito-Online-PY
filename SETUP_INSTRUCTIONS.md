# 📋 Instrucciones de Configuración - Pasos a Seguir

## 🔧 Configuración de Nuevas Funcionalidades (Fase 8)

### Paso 1: Aplicar Migraciones de Base de Datos

Necesitas aplicar las nuevas migraciones a tu base de datos de Supabase:

#### Opción A: Usando Supabase CLI (Recomendado)

1. **Abre tu terminal** en la carpeta del proyecto:
   ```bash
   cd C:\Users\PCera\mercadito-online-py
   ```

2. **Verifica que estás conectado a Supabase**:
   ```bash
   npx supabase status
   ```

3. **Aplica las migraciones**:
   ```bash
   npx supabase db push
   ```

#### Opción B: Desde el Dashboard de Supabase

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Ve a **SQL Editor**
3. Copia el contenido de cada archivo de migración y ejecútalo:
   - `supabase/migrations/20250128000036_wishlist_system.sql`
   - `supabase/migrations/20250128000037_payment_system.sql`
   - `supabase/migrations/20250128000038_shipping_system.sql`
4. Haz clic en **Run** para cada uno

### Paso 2: Verificar que las Tablas se Crearon Correctamente

1. En Supabase Dashboard, ve a **Table Editor**
2. Verifica que existan estas tablas nuevas:
   - ✅ `wishlists`
   - ✅ `payment_intents`
   - ✅ `shipments`
   - ✅ `shipment_events`

### Paso 3: Probar las Nuevas Funcionalidades

#### Probar Wishlist:
1. Inicia sesión en la aplicación
2. Ve a cualquier producto
3. Haz clic en el ícono de corazón (💚) para agregar a favoritos
4. Ve a `/wishlist` para ver tu lista de favoritos

#### Probar Recomendaciones:
1. Navega algunos productos
2. Al final de la página de un producto, deberías ver "Productos Similares"
3. En la página principal, deberías ver "Productos Recomendados para Ti"

#### Probar Comparación (próximamente):
1. Agregar múltiples productos a comparar
2. Ver la tabla comparativa

### Paso 4: Verificar que No Hay Errores

1. Si tienes el servidor corriendo (`npm run dev`), revisa la consola
2. Si ves errores, avísame y te ayudo a solucionarlos

---

## ✅ Checklist de Verificación

Marca cada paso cuando lo completes:

- [ ] Migración `wishlist_system.sql` aplicada
- [ ] Migración `payment_system.sql` aplicada  
- [ ] Migración `shipping_system.sql` aplicada
- [ ] Tablas visibles en Supabase Table Editor
- [ ] Wishlist funciona (agregar/quitar favoritos)
- [ ] Página `/wishlist` carga correctamente
- [ ] No hay errores en la consola del navegador
- [ ] No hay errores en la terminal del servidor

---

## 🆘 Si Encuentras Problemas

1. **Error al aplicar migración**: 
   - Copia el mensaje de error completo
   - Verifica que las tablas no existan ya

2. **Wishlist no funciona**:
   - Verifica que estés autenticado
   - Revisa la consola del navegador (F12) para errores

3. **Recomendaciones no aparecen**:
   - Esto es normal si no hay suficiente historial de usuario
   - Aparecerán productos trending por defecto

---

## 📝 Notas Importantes

- Las integraciones de pago (Stripe, PayPal) requerirán configuración adicional más adelante
- El sistema de envíos está listo para usar, pero necesita integración con APIs reales de carriers
- Las notificaciones push necesitarán configuración de VAPID keys

¿Listo para continuar? ¡Avísame cuando hayas completado estos pasos!

