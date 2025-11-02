# ✅ VERIFICACIÓN POST-DEPLOY

**Fecha:** 2025-01-30  
**Estado:** Variables de entorno configuradas ✅

---

## ✅ VERIFICACIÓN INICIAL

Según la captura de Vercel, tienes configurado:

### **Variables de Entorno Configuradas:**
- [x] ✅ `CRON_SECRET` - Agregado "just now"
- [x] ✅ `RESEND_API_KEY` - Agregado Oct 29
- [x] ✅ `RESEND_FROM` - Agregado Oct 29
- [x] ✅ `NEXT_PUBLIC_SUPABASE_URL` - Ya existía
- [x] ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Ya existía

---

## 🚀 SIGUIENTE PASO: REDEPLOY

### **¿Qué hacer ahora?**

1. **Hacer clic en el botón "Redeploy"** que aparece en la notificación azul
   - O ir a **Deployments** → Último deployment → 3 puntos → **Redeploy**

2. **Esperar a que termine el deploy** (2-3 minutos)

3. **Verificar que no hay errores** en el deployment

---

## ✅ VERIFICACIONES POST-REDEPLOY

### **1. Verificar que los Cron Jobs están activos**

**En Vercel Dashboard:**
1. Ve a **Settings** → **Cron Jobs**
2. Deberías ver estos 5 cron jobs configurados:

```
✅ /api/cron/close-auctions        → */1 * * * * (cada minuto)
✅ /api/cron/nightly-audit         → 0 2 * * * (2 AM diario)
✅ /api/cron/cleanup-inactive      → 0 3 * * * (3 AM diario)
✅ /api/cron/backup-database       → 0 1 * * 0 (Domingo 1 AM)
✅ /api/cron/backup-storage        → 0 2 * * 0 (Domingo 2 AM)
✅ /api/cron/cleanup-backups       → 0 3 * * 0 (Domingo 3 AM)
```

### **2. Verificar que existe un usuario Admin**

**En Supabase Dashboard o ejecutando SQL:**
```sql
SELECT id, email, role 
FROM profiles 
WHERE role = 'admin';
```

**Si no existe admin:**
```sql
-- Crear o actualizar un usuario como admin
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'tu-email@ejemplo.com';
```

### **3. Probar manualmente los endpoints (Opcional)**

**Probar Auditoría Nocturna:**
```bash
# Reemplaza TU_CRON_SECRET y tu-dominio.com
curl -X GET "https://tu-dominio.com/api/cron/nightly-audit" \
  -H "Authorization: Bearer TU_CRON_SECRET"
```

**Resultado esperado:**
```json
{
  "success": true,
  "alertsCreated": 0,
  "alertsByType": {
    "unpaid_orders": 0,
    "missing_auction_orders": 0,
    "suspicious_bidders": 0
  },
  "criticalAlertsCount": 0,
  "timestamp": "2025-01-30T..."
}
```

---

## 📊 QUÉ ESPERAR DESPUÉS DEL REDEPLOY

### **Funcionamiento Automático:**

1. **Cada minuto:**
   - ✅ Cierre automático de subastas expiradas (`/api/cron/close-auctions`)

2. **Cada día a las 2 AM:**
   - ✅ Auditoría nocturna (`/api/cron/nightly-audit`)
   - Busca órdenes sin pago >48h
   - Busca subastas sin orden
   - Crea alertas en `admin_alerts`
   - Envía email a admin si hay alertas críticas/altas

3. **Cada día a las 3 AM:**
   - ✅ Limpieza inactivos (`/api/cron/cleanup-inactive`)
   - Oculta productos sin stock
   - Pausa tiendas inactivas >90 días
   - Registra acciones en `maintenance_logs`

4. **Cada domingo:**
   - ✅ Backup database (1 AM)
   - ✅ Backup storage (2 AM)
   - ✅ Limpieza backups antiguos (3 AM)

---

## 🔍 MONITOREO

### **Verificar que los Cron Jobs se ejecutan:**

**En Vercel Dashboard:**
1. Ve a **Deployments** → **Functions**
2. Busca los endpoints `/api/cron/...`
3. Deberías ver logs de ejecución con timestamps

### **Verificar alertas creadas:**

**En Supabase Dashboard:**
```sql
-- Ver últimas alertas
SELECT * FROM admin_alerts 
ORDER BY created_at DESC 
LIMIT 10;

-- Ver alertas por tipo
SELECT alert_type, severity, COUNT(*) 
FROM admin_alerts 
WHERE status = 'open' 
GROUP BY alert_type, severity;
```

### **Verificar logs de mantenimiento:**

```sql
-- Ver últimas acciones de limpieza
SELECT * FROM maintenance_logs 
ORDER BY executed_at DESC 
LIMIT 10;
```

### **Verificar backups:**

```sql
-- Ver estado de backups
SELECT backup_type, status, COUNT(*) 
FROM backup_logs 
GROUP BY backup_type, status;
```

---

## ⚠️ TROUBLESHOOTING

### **Si los cron jobs no se ejecutan:**

1. **Verificar que las variables están en Production:**
   - Ve a Settings → Environment Variables
   - Verifica que cada variable tiene ☑️ Production marcado

2. **Verificar logs de errores:**
   - Ve a Deployments → Functions → `/api/cron/nightly-audit`
   - Revisa los logs para ver errores

3. **Verificar CRON_SECRET:**
   - Asegúrate que el secret en Vercel coincide con el usado en los headers

### **Si no se reciben emails:**

1. **Verificar que existe admin:**
   ```sql
   SELECT email, role FROM profiles WHERE role = 'admin';
   ```

2. **Verificar RESEND_API_KEY:**
   - Ve a Resend Dashboard → API Keys
   - Verifica que la key está activa

3. **Verificar RESEND_FROM:**
   - Debería ser `onboarding@resend.dev` o tu dominio verificado

4. **Revisar carpeta de spam:**
   - Los emails pueden ir a spam la primera vez

### **Si hay errores en los logs:**

**Error: "Unauthorized":**
- ✅ CRON_SECRET no coincide o falta

**Error: "Resend API error":**
- ✅ RESEND_API_KEY incorrecta o expirada

**Error: "Function timeout":**
- ✅ Normal si hay muchos datos, considerar aumentar `maxDuration`

---

## ✅ CHECKLIST POST-REDEPLOY

- [ ] Redeploy completado sin errores
- [ ] Cron jobs visibles en Vercel → Settings → Cron Jobs
- [ ] Existe usuario con `role='admin'` en `profiles`
- [ ] Variables de entorno tienen ☑️ Production
- [ ] (Opcional) Probar endpoint manualmente
- [ ] (Opcional) Verificar logs en Vercel Functions
- [ ] Esperar primera ejecución automática

---

## 🎯 RESUMEN

**Estado Actual:** ✅ Variables configuradas  
**Siguiente Paso:** ⏭️ **Hacer Redeploy**  
**Después:** ⏱️ Esperar ejecución automática de cron jobs  
**Monitoreo:** 📊 Revisar logs y tablas en Supabase

---

**¿Todo listo?** Haz clic en **"Redeploy"** y todo debería funcionar automáticamente. 🚀

