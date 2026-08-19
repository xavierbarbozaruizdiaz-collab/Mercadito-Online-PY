# Análisis del Problema: `supabase db push` se cuelga

## 🔍 Problema Identificado

El comando `npm run db:push` (que ejecuta `npx supabase db push`) se **cuelga indefinidamente** después de intentar conectarse a la base de datos remota.

## ❌ Error Específico

```
failed to connect as temp role: failed to connect to
`host=aws-1-sa-east-1.pooler.supabase.com
user=cli_login_postgres.hqdatzhliaordlsqtjea database=postgres`: 
failed SASL auth (unexpected EOF)
```

## 🔎 Causa Raíz

**Error de autenticación SASL con el connection pooler de Supabase:**
- El CLI intenta conectarse usando el pooler (`aws-1-sa-east-1.pooler.supabase.com`)
- La autenticación SASL falla con "unexpected EOF" (conexión cerrada inesperadamente)
- Esto puede ser por:
  1. **Credenciales expiradas** - El token de acceso puede haber expirado
  2. **Problema de red/firewall** - Conexión bloqueada o interrumpida
  3. **Problema con el pooler** - El pooler puede estar teniendo problemas
  4. **Sesión de Supabase CLI expirada** - Necesita re-autenticarse

## ✅ Soluciones Posibles

### Opción 1: Re-autenticarse con Supabase CLI
```bash
npx supabase login
# Luego volver a vincular
npx supabase link --project-ref hqdatzhliaordlsqtjea
```

### Opción 2: Re-vincular con conexión directa
El flag `--skip-pooler` solo está disponible en `link`, no en `db push`. Re-vincular el proyecto:
```bash
npx supabase link --project-ref hqdatzhliaordlsqtjea --skip-pooler
```

### Opción 3: Aplicar migraciones manualmente
1. Ir a Supabase Dashboard → SQL Editor
2. Ejecutar cada migración pendiente manualmente
3. O usar el script: `npm run db:marketing` para copiar SQL al portapapeles

### Opción 4: Verificar estado de la conexión
```bash
# Verificar si el proyecto está correctamente vinculado
npx supabase projects list
```

## 📊 Estado Actual

- ✅ Proyecto vinculado: `hqdatzhliaordlsqtjea`
- ✅ Migraciones duplicadas corregidas (renombradas)
- ❌ Conexión a BD remota fallando (SASL auth error)
- ⏱️ Comando se cuelga después de ~30 segundos

## 🎯 Próximos Pasos Recomendados

1. **Intentar re-autenticación:**
   ```bash
   npx supabase login
   ```

2. **Si falla, re-vincular con conexión directa:**
   ```bash
   npx supabase link --project-ref hqdatzhliaordlsqtjea --skip-pooler
   npx supabase db push --yes
   ```

3. **Como último recurso, aplicar manualmente en Dashboard**

