# 📋 Listado de Tareas Pendientes

## 🔍 Resumen de Verificación

Este documento lista todas las tareas pendientes identificadas después de revisar el código, documentación y migraciones del proyecto.

---

## 🚨 Tareas Críticas (Alta Prioridad)

### 1. ✅ **Funcionalidad de Edición de Perfiles por Admin** - INCOMPLETA

**Estado:** Migración creada, pero falta implementación en frontend

**Descripción:**
- ✅ Migración `20251114094500_add_admin_profiles_policy.sql` creada (permite a admins actualizar perfiles)
- ❌ La página `/dashboard/profile` NO soporta edición por admin
- ❌ La página `/admin/users` redirige a `/dashboard/profile?userId=${user.id}&admin=true` pero esta funcionalidad NO existe

**Archivos afectados:**
- `src/app/dashboard/profile/page.tsx` - No maneja parámetros `userId` ni `admin` de la URL
- `src/app/admin/users/page.tsx` - Redirige a funcionalidad inexistente (línea 360)

**Tarea pendiente:**
1. Modificar `src/app/dashboard/profile/page.tsx` para:
   - Leer parámetros `userId` y `admin` de la URL usando `useSearchParams()`
   - Verificar que el usuario actual sea admin cuando `admin=true`
   - Cargar el perfil del `userId` especificado en lugar del usuario actual
   - Permitir edición completa del perfil cuando es modo admin
   - Mostrar indicador visual de que está editando como admin
   - Validar permisos antes de guardar cambios

**Impacto:** Los admins no pueden editar perfiles de otros usuarios desde la interfaz, aunque la política de base de datos lo permite.

**✅ Puedo hacerlo:** Sí, implementación de código frontend

---

## ⚙️ Tareas de Escalabilidad (Media Prioridad)

### 2. ⚠️ **Integración de Redis para Caché Distribuido** - PREPARADO PERO NO IMPLEMENTADO

**Estado:** Documentación completa, código preparado, pero no implementado

**Descripción:**
- ✅ Documentación en `docs/SCALING_SETUP.md` y `docs/QUICK_START_SCALING.md`
- ✅ `docker-compose.prod.yml` incluye servicio Redis
- ✅ `env.production.example` incluye variables `REDIS_URL` y `REDIS_PASSWORD`
- ❌ `src/lib/cache/cacheManager.ts` usa caché en memoria (Map) en lugar de Redis
- ❌ Comentarios en código indican "Para producción, migrar a Redis"

**Archivos afectados:**
- `src/lib/cache/cacheManager.ts` - Usa `Map` en memoria
- `src/lib/utils/rateLimit.ts` - Comentario: "Cache en memoria para rate limiting (simple, sin Redis)"
- `src/lib/utils/cache.ts` - Comentario: "Para producción, migrar a Redis"
- `src/lib/utils/locks.ts` - Comentario: "Para producción con múltiples instancias, usar Redis"
- `src/lib/utils/queue.ts` - Comentario: "Para producción, migrar a Bull/BullMQ con Redis"
- `src/middleware.ts` - Comentario: "Cache en memoria para rate limiting (simple; en prod real usar Redis)"

**Tarea pendiente:**
1. Instalar dependencias Redis (ej: `ioredis` o `@redis/client`)
2. Crear servicio de conexión a Redis
3. Modificar `CacheManager` para usar Redis en lugar de Map
4. Actualizar `rateLimit.ts` para usar Redis
5. Actualizar `locks.ts` para usar Redis (distributed locks)
6. Actualizar `queue.ts` para usar Bull/BullMQ con Redis
7. Actualizar `middleware.ts` para usar Redis en rate limiting
8. Configurar variables de entorno en producción

**Impacto:** El sistema actual funciona solo en una instancia. Con múltiples instancias, el caché, rate limiting y locks no funcionan correctamente.

**Nota:** Según la documentación, esto solo es necesario cuando se tengan más de 1,000 usuarios simultáneos.

**✅ Puedo hacerlo:** Sí, implementación de código (requiere configuración externa manual de Redis)

---

### 3. ⚠️ **Integración de AWS SQS para Message Queue** - DOCUMENTADO PERO NO IMPLEMENTADO

**Estado:** Documentación completa, pero código no implementado

**Descripción:**
- ✅ Documentación en `docs/SCALING_SETUP.md` explica cómo configurar AWS SQS
- ✅ `docs/QUICK_START_SCALING.md` menciona AWS SQS para 10k+ usuarios
- ❌ No hay implementación de código para usar SQS
- ❌ No hay variables de entorno para SQS en `env.production.example`

**Archivos afectados:**
- No hay archivos que usen SQS actualmente
- Necesita crear nuevos archivos para integración SQS

**Tarea pendiente:**
1. Instalar SDK de AWS (`@aws-sdk/client-sqs`)
2. Crear servicio de integración con SQS
3. Implementar cola de mensajes para pujas de subastas (mencionado en documentación)
4. Actualizar endpoints de subastas para usar SQS cuando esté configurado
5. Agregar variables de entorno: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_SQS_QUEUE_URL`
6. Documentar proceso de configuración

**Impacto:** Para escalar a 10,000+ usuarios simultáneos, se necesita SQS para procesar pujas de forma asíncrona.

**Nota:** Según la documentación, esto solo es necesario cuando se tengan más de 10,000 usuarios simultáneos.

**✅ Puedo hacerlo:** Sí, implementación de código (requiere configuración externa manual de AWS SQS)

---

## ❌ TAREAS QUE NO PUEDO HACER (Configuraciones Manuales Externas)

### 🔍 Tareas de Verificación (Baja Prioridad)

### 4. ❌ **Verificación de Migraciones Aplicadas**

**Estado:** Migraciones creadas, pero necesita verificación

**Descripción:**
- ✅ Migración `20251114093000_fix_is_user_store_owner.sql` creada
- ✅ Migración `20251114094500_add_admin_profiles_policy.sql` creada
- ❓ Necesita verificar que estén aplicadas en producción

**Tarea pendiente:**
1. Verificar que las migraciones estén aplicadas en Supabase
2. Verificar que las políticas RLS estén activas
3. Probar la funcionalidad de admin update profiles en producción

---

## 📊 Resumen por Tipo de Tarea

### ✅ TAREAS QUE SÍ PUEDO HACER (Código)

1. **✅ Funcionalidad de Edición de Perfiles por Admin** (Alta Prioridad)
   - Implementación de código frontend
   - Puedo hacerlo ahora

2. **✅ Integración de Redis** (Media Prioridad)
   - Implementación de código
   - Requiere configuración externa manual después
   - Puedo hacerlo ahora

3. **✅ Integración de AWS SQS** (Media Prioridad)
   - Implementación de código
   - Requiere configuración externa manual después
   - Puedo hacerlo ahora

### ❌ TAREAS QUE NO PUEDO HACER (Configuraciones Manuales Externas)

4. **❌ Verificación de Migraciones Aplicadas** (Baja Prioridad)
   - Requiere acceso a producción/Supabase

5. **❌ Configuración Externa de Redis** (Cuando sea necesario)
   - Requiere acceso a Upstash y Vercel

6. **❌ Configuración Externa de AWS SQS** (Cuando sea necesario)
   - Requiere acceso a AWS y Vercel

7. **❌ Configuración Externa de Cloudflare** (Recomendado)
   - Requiere acceso a Cloudflare y registrador

8. **❌ Upgrade de Supabase** (Cuando sea necesario)
   - Requiere acceso a Supabase y método de pago

---

## 📝 Notas Adicionales

### Funcionalidades Completadas ✅
- ✅ Sistema de escalabilidad documentado
- ✅ Migraciones de base de datos para admin profiles
- ✅ Políticas RLS para admin update profiles
- ✅ Página de administración de usuarios (`/admin/users`)
- ✅ Sistema de caché en memoria (funcional para una instancia)
- ✅ Rate limiting en memoria (funcional para una instancia)
- ✅ Sistema de locks en memoria (funcional para una instancia)

### Funcionalidades Preparadas pero No Implementadas ⚠️
- ⚠️ Redis para caché distribuido
- ⚠️ AWS SQS para message queue
- ⚠️ Edición de perfiles por admin en frontend

---

## 🎯 Plan de Acción

### ✅ Fase 1: Implementación de Código (YO PUEDO HACER)

**1.1. Funcionalidad Admin (Inmediato - Alta Prioridad)**
- ✅ Implementar edición de perfiles por admin en `/dashboard/profile`
- ✅ Probar funcionalidad en desarrollo
- ✅ Listo para desplegar

**1.2. Integración de Redis (Media Prioridad)**
- ✅ Implementar código de Redis
- ✅ Actualizar CacheManager, rateLimit, locks, queue
- ⚠️ Requiere configuración externa después (Upstash + Vercel)

**1.3. Integración de AWS SQS (Media Prioridad)**
- ✅ Implementar código de AWS SQS
- ✅ Actualizar endpoints de subastas
- ⚠️ Requiere configuración externa después (AWS + Vercel)

### ❌ Fase 2: Configuraciones Externas (TÚ DEBES HACER)

**2.1. Verificación de Migraciones**
- ❌ Verificar migraciones aplicadas en Supabase
- ❌ Probar funcionalidad en producción

**2.2. Configuración de Redis (Cuando se tenga 1k+ usuarios)**
- ❌ Crear cuenta en Upstash
- ❌ Crear base de datos Redis
- ❌ Configurar variables de entorno en Vercel

**2.3. Configuración de AWS SQS (Cuando se tenga 10k+ usuarios)**
- ❌ Crear cuenta en AWS
- ❌ Crear cola SQS
- ❌ Configurar IAM User
- ❌ Configurar variables de entorno en Vercel

**2.4. Configuración de Cloudflare (Recomendado - Gratis)**
- ❌ Crear cuenta en Cloudflare
- ❌ Agregar dominio
- ❌ Cambiar nameservers
- ❌ Configurar Auto Minify y Brotli

**2.5. Upgrade de Supabase (Cuando se tenga 200+ usuarios)**
- ❌ Upgrade a plan Pro o Team
- ❌ Configurar billing

---

**Última actualización:** Noviembre 2024
**Revisado por:** Sistema de verificación automática

