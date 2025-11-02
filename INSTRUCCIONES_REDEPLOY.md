# 🚀 INSTRUCCIONES FINALES - REDEPLOY

**Fecha:** 2025-01-30  
**Estado:** ✅ Todo listo - Solo falta redeploy

---

## ⚡ ACCIÓN INMEDIATA

### **Hacer Redeploy en Vercel:**

1. **Ir a Vercel Dashboard:**
   - https://vercel.com/
   - Iniciar sesión
   - Seleccionar proyecto `mercadito-online-py`

2. **Hacer Redeploy:**
   - Opción A: Hacer clic en el botón **"Redeploy"** de la notificación azul
   - Opción B: Ir a **Deployments** → Último deployment → **3 puntos** → **Redeploy**

3. **Esperar:**
   - El deployment tomará 2-3 minutos
   - Esperar hasta que muestre estado **"Ready"** ✅

---

## ✅ VERIFICACIONES POST-REDEPLOY

### **1. Verificar Cron Jobs (Vercel):**

```
Vercel Dashboard → Settings → Cron Jobs
```

**Deberías ver 6 cron jobs:**
- ✅ `/api/cron/close-auctions` - `*/1 * * * *`
- ✅ `/api/cron/nightly-audit` - `0 2 * * *`
- ✅ `/api/cron/cleanup-inactive` - `0 3 * * *`
- ✅ `/api/cron/backup-database` - `0 1 * * 0`
- ✅ `/api/cron/backup-storage` - `0 2 * * 0`
- ✅ `/api/cron/cleanup-backups` - `0 3 * * 0`

### **2. Probar Endpoints Manualmente:**

**Obtener CRON_SECRET:**
1. Vercel → Settings → Environment Variables
2. Haz clic en el **ícono del ojo** 👁️ en `CRON_SECRET`
3. Copia el valor

**En PowerShell (Windows):**
```powershell
# Configurar variables
$env:CRON_SECRET = "tu-cron-secret-aqui"
$env:APP_URL = "https://tu-dominio.vercel.app"

# Ejecutar script de prueba
.\scripts\test-cron-endpoints.ps1
```

**En Bash/Git Bash:**
```bash
# Configurar variables
export CRON_SECRET="tu-cron-secret-aqui"
export APP_URL="https://tu-dominio.vercel.app"

# Ejecutar script de prueba
bash scripts/test-cron-endpoints.sh
```

**O manualmente con curl:**
```bash
curl -X GET "https://tu-dominio.vercel.app/api/cron/nightly-audit" \
  -H "Authorization: Bearer TU_CRON_SECRET"
```

### **3. Verificar Logs (Vercel):**

```
Vercel → Deployments → Functions → /api/cron/nightly-audit
```

Deberías ver logs de ejecución con timestamps.

### **4. Verificar en Supabase:**

Ejecutar `scripts/verificar-supabase.sql` en Supabase Dashboard → SQL Editor para verificar:
- ✅ Usuario admin configurado
- ✅ Tablas creadas
- ✅ Funciones SQL existentes
- ✅ Índices creados

---

## 📊 QUÉ ESPERAR DESPUÉS DEL REDEPLOY

### **Funcionamiento Automático:**

1. **Cada minuto:**
   - ✅ Cierre automático de subastas expiradas

2. **Cada día a las 2 AM:**
   - ✅ Auditoría nocturna ejecutada
   - ✅ Alertas creadas en `admin_alerts`
   - ✅ Email enviado a `mercadoxbar@gmail.com` si hay alertas críticas/altas

3. **Cada día a las 3 AM:**
   - ✅ Limpieza inactivos ejecutada
   - ✅ Productos sin stock ocultados
   - ✅ Tiendas inactivas pausadas
   - ✅ Acciones registradas en `maintenance_logs`

4. **Cada domingo:**
   - ✅ Backup database (1 AM)
   - ✅ Backup storage (2 AM)
   - ✅ Limpieza backups (3 AM)

---

## 🧪 TESTING OPCIONAL

### **Probar Auditoría Ahora:**

Si quieres probar la auditoría sin esperar a las 2 AM:

```powershell
# PowerShell
$headers = @{
    "Authorization" = "Bearer TU_CRON_SECRET"
}
Invoke-RestMethod -Uri "https://tu-dominio.vercel.app/api/cron/nightly-audit" -Method GET -Headers $headers
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

## 📧 VERIFICAR EMAILS

### **En Resend Dashboard:**
1. Ir a https://resend.com/emails
2. Verificar que se están enviando emails
3. Revisar carpeta de spam si no llegan

### **Crear Alerta de Prueba:**

```sql
-- Crear alerta de prueba
INSERT INTO admin_alerts (
    alert_type,
    severity,
    title,
    description,
    status
) VALUES (
    'system_error',
    'high',
    'Prueba de Email',
    'Esta es una prueba para verificar que el email funciona',
    'open'
);
```

Luego ejecutar manualmente la auditoría para que envíe el email.

---

## ✅ CHECKLIST FINAL

- [ ] Redeploy completado en Vercel
- [ ] Deployment muestra estado "Ready"
- [ ] Cron jobs visibles en Settings → Cron Jobs
- [ ] (Opcional) Probar endpoint manualmente
- [ ] (Opcional) Verificar logs en Functions
- [ ] Esperar primera ejecución automática o probar manualmente

---

## 🎯 RESUMEN

**Estado:** ✅ Todo configurado  
**Acción:** ⏭️ **REDEPLOY en Vercel**  
**Tiempo:** 2-3 minutos  
**Resultado:** Sistema automático funcionando

---

**¿Listo?** Ve a Vercel y haz clic en **"Redeploy"** 🚀

