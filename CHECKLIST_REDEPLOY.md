# ✅ CHECKLIST PRE-REDEPLOY

**Email Admin:** `mercadoxbar@gmail.com`

---

## ✅ VERIFICACIONES ANTES DE REDEPLOY

### **1. Verificar que mercadoxbar@gmail.com es Admin**

**Ejecutar en Supabase Dashboard → SQL Editor:**

```sql
-- Verificar rol del usuario
SELECT 
    id, 
    email, 
    role,
    CASE 
        WHEN role = 'admin' THEN '✅ ES ADMIN'
        ELSE '❌ NO ES ADMIN - Necesita actualización'
    END as status
FROM profiles 
WHERE email = 'mercadoxbar@gmail.com';
```

**Si NO es admin, ejecutar:**
```sql
UPDATE profiles 
SET role = 'admin'
WHERE email = 'mercadoxbar@gmail.com';
```

**Si el usuario no existe en profiles pero sí en auth.users:**
```sql
INSERT INTO profiles (id, email, role)
SELECT id, email, 'admin'
FROM auth.users
WHERE email = 'mercadoxbar@gmail.com'
ON CONFLICT (id) DO UPDATE SET 
    role = 'admin',
    email = EXCLUDED.email;
```

### **2. Verificar Variables de Entorno en Vercel**

Ya verificadas en captura anterior:
- [x] ✅ `CRON_SECRET` - Configurado
- [x] ✅ `RESEND_API_KEY` - Configurado  
- [x] ✅ `RESEND_FROM` - Configurado
- [x] ✅ `NEXT_PUBLIC_SUPABASE_URL` - Configurado
- [x] ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Configurado

### **3. Verificar que RESEND_FROM tiene valor válido**

En Vercel → Settings → Environment Variables:
- `RESEND_FROM` debería ser: `onboarding@resend.dev` o tu dominio verificado

---

## 🚀 REDEPLOY

### **Paso 1: Hacer Redeploy**
1. Ve a Vercel Dashboard
2. Haz clic en **"Redeploy"** (botón azul en la notificación)
3. O ve a **Deployments** → Último deployment → 3 puntos → **Redeploy**
4. Espera 2-3 minutos

### **Paso 2: Verificar Deploy Exitoso**
- ✅ El deployment debe mostrar "Ready" en verde
- ✅ No debe haber errores en los logs
- ✅ Las funciones deben estar disponibles

---

## ✅ VERIFICACIONES POST-REDEPLOY

### **1. Verificar Cron Jobs**
1. Vercel → Settings → Cron Jobs
2. Deberías ver 6 cron jobs configurados

### **2. Probar Auditoría Manualmente (Opcional)**

```bash
# Obtener CRON_SECRET de Vercel (ícono del ojo)
# Reemplazar valores
curl -X GET "https://tu-dominio.vercel.app/api/cron/nightly-audit" \
  -H "Authorization: Bearer TU_CRON_SECRET"
```

**Resultado esperado:**
```json
{
  "success": true,
  "alertsCreated": 0,
  "criticalAlertsCount": 0
}
```

### **3. Verificar que Admin Recibe Emails**

**Crear una alerta de prueba:**
```sql
-- Crear alerta de prueba para verificar email
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

**Luego ejecutar manualmente la auditoría** (ver paso 2 arriba). Si hay alertas críticas/altas, debería enviar email a `mercadoxbar@gmail.com`.

---

## 📋 RESUMEN

**Estado Actual:**
- ✅ Variables configuradas
- ⏳ Verificar que `mercadoxbar@gmail.com` tiene `role='admin'`
- ⏳ Hacer Redeploy

**Después del Redeploy:**
- ⏳ Los cron jobs empezarán a ejecutarse automáticamente
- ⏳ Si hay alertas, se enviarán emails a `mercadoxbar@gmail.com`

---

## ⚠️ IMPORTANTE

**Antes de hacer redeploy, verifica:**
1. ✅ Que `mercadoxbar@gmail.com` tiene `role='admin'` en `profiles`
2. ✅ Que `RESEND_FROM` está configurado correctamente
3. ✅ Que todas las variables tienen ☑️ Production marcado

**Después del redeploy:**
- Las funciones estarán activas
- Los cron jobs empezarán a ejecutarse según el horario configurado
- Los emails irán a `mercadoxbar@gmail.com` si hay alertas críticas/altas

---

**¿Listo para redeploy?** ✅ Verifica admin primero, luego haz redeploy. 🚀

