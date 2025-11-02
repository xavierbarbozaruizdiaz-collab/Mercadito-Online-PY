# ✅ CHECKLIST DE DEPLOY - MEJORAS P7, P8, P9

**Fecha:** 2025-01-30  
**Estado:** ✅ **MIGRACIONES APLICADAS** - Listo para producción

---

## ✅ VERIFICACIONES COMPLETADAS

### **Migraciones SQL:**
- [x] `20250130000009_audit_and_maintenance.sql` - Aplicada
- [x] `20250130000010_backup_system.sql` - Aplicada
- [x] Base de datos sincronizada (`npx supabase db push` exitoso)

### **Archivos Creados:**
- [x] Tablas: `admin_alerts`, `maintenance_logs`, `backup_logs`
- [x] Funciones SQL: `run_nightly_audit()`, `cleanup_inactive_items()`, `cleanup_old_backups()`
- [x] API Routes: 5 endpoints de cron configurados
- [x] Configuración: `vercel.json` actualizado con cron jobs

---

## ⚠️ CONFIGURACIÓN REQUERIDA EN PRODUCCIÓN

### **1. Variables de Entorno (Vercel):**
```bash
# Crítico para autorización de cron jobs
CRON_SECRET=<mínimo 32 caracteres aleatorios>

# Requerido para emails de alertas
RESEND_API_KEY=<tu_api_key>
RESEND_FROM_EMAIL=noreply@tu-dominio.com

# Ya configuradas (verificar que existan)
NEXT_PUBLIC_SUPABASE_URL=<url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<key>
SUPABASE_SERVICE_ROLE_KEY=<key>
```

### **2. Usuario Admin:**
- [ ] Verificar que existe usuario con `role='admin'` en tabla `profiles`
- [ ] Verificar que el admin tiene email válido configurado

### **3. Cron Jobs (Vercel):**
Los cron jobs están configurados en `vercel.json`. Verificar en Vercel Dashboard → Settings → Cron Jobs:
- [ ] `/api/cron/nightly-audit` - 2 AM diario
- [ ] `/api/cron/cleanup-inactive` - 3 AM diario
- [ ] `/api/cron/backup-database` - Domingo 1 AM
- [ ] `/api/cron/backup-storage` - Domingo 2 AM
- [ ] `/api/cron/cleanup-backups` - Domingo 3 AM

---

## 🧪 TESTING RECOMENDADO

### **1. Probar Auditoría Nocturna:**
```bash
# Ejecutar manualmente (reemplazar CRON_SECRET con tu valor)
curl -X GET "https://tu-dominio.com/api/cron/nightly-audit" \
  -H "Authorization: Bearer TU_CRON_SECRET"
```

**Resultado esperado:**
- Detecta órdenes sin pago >48h
- Detecta subastas sin orden
- Crea alertas en `admin_alerts`
- Envía email a admin (si hay alertas críticas/altas)

### **2. Probar Limpieza Inactivos:**
```bash
curl -X GET "https://tu-dominio.com/api/cron/cleanup-inactive" \
  -H "Authorization: Bearer TU_CRON_SECRET"
```

**Resultado esperado:**
- Oculta productos sin stock
- Pausa tiendas inactivas >90 días
- Crea registro en `maintenance_logs`

### **3. Verificar Funciones SQL:**
```sql
-- Probar auditoría
SELECT run_nightly_audit();

-- Probar limpieza
SELECT cleanup_inactive_items();

-- Ver backups
SELECT * FROM backup_logs ORDER BY created_at DESC LIMIT 5;
```

---

## 📊 MONITOREO POST-DEPLOY

### **Tablas a Monitorear:**
1. **`admin_alerts`** - Verificar nuevas alertas
2. **`maintenance_logs`** - Verificar acciones de limpieza
3. **`backup_logs`** - Verificar backups programados

### **Queries Útiles:**
```sql
-- Alertas abiertas por tipo
SELECT alert_type, severity, COUNT(*) 
FROM admin_alerts 
WHERE status = 'open' 
GROUP BY alert_type, severity;

-- Últimas acciones de limpieza
SELECT * FROM maintenance_logs 
ORDER BY executed_at DESC 
LIMIT 10;

-- Estado de backups
SELECT backup_type, status, COUNT(*) 
FROM backup_logs 
GROUP BY backup_type, status;
```

---

## 📝 NOTAS IMPORTANTES

### **Backups (P9):**
⚠️ **Limitación Actual:**
- Tracking completo implementado ✅
- Sync real a S3/R2 requiere configuración adicional
- **Recomendación:** Usar Supabase Dashboard → Database → Backups para backups automáticos de DB

### **Performance:**
- Auditoría nocturna puede tardar varios minutos con muchas órdenes
- Limpieza es eficiente gracias a índices optimizados
- Todos los cron jobs tienen `maxDuration` configurado

### **Seguridad:**
- Todas las rutas verifican `CRON_SECRET`
- Funciones SQL usan `SECURITY DEFINER` apropiadamente
- Logging estructurado para auditoría

---

## ✅ ESTADO FINAL

**Migraciones:** ✅ Aplicadas exitosamente  
**Código:** ✅ Sin errores de lint  
**Configuración:** ⚠️ Requiere variables de entorno en Vercel  
**Testing:** ⏳ Pendiente (recomendado antes de producción)

---

**Listo para:** Deploy a producción después de configurar variables de entorno

