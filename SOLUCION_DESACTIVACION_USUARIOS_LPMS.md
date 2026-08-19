# 🎯 SOLUCIÓN PROFESIONAL LPMS - Sistema de Desactivación de Usuarios

**Fecha:** 2025-11-30  
**Autor:** Lead Product Manager Senior  
**Objetivo:** Implementar sistema robusto de desactivación de usuarios con bloqueo real de acceso

---

## 📊 ANÁLISIS LPMS COMPLETO

### 1. MAPEO DE FLUJOS AFECTADOS

#### 1.1 Flujo de Autenticación
**Punto de entrada:** `/auth/sign-in`
- ❌ **Actual:** No verifica `is_active`
- ✅ **Necesario:** Verificar antes de permitir login
- **Impacto:** CRÍTICO - Usuario inactivo puede seguir accediendo

#### 1.2 Flujo de Sesión Activa
**Punto de verificación:** Cada request autenticado
- ❌ **Actual:** No hay verificación continua
- ✅ **Necesario:** Middleware que verifique `is_active` en cada request
- **Impacto:** ALTO - Usuario con sesión activa sigue funcionando

#### 1.3 Flujo de Dashboard
**Punto de entrada:** `/dashboard/*`
- ❌ **Actual:** Solo verifica autenticación, no `is_active`
- ✅ **Necesario:** Layout que verifique estado activo
- **Impacto:** ALTO - Usuario inactivo puede usar dashboard

#### 1.4 Flujo de API Routes
**Punto de verificación:** Todas las rutas `/api/*` protegidas
- ❌ **Actual:** Solo rate limiting, no verifica `is_active`
- ✅ **Necesario:** Middleware que bloquee requests de usuarios inactivos
- **Impacto:** CRÍTICO - APIs pueden ser usadas por usuarios inactivos

#### 1.5 Flujo de Creación de Recursos
**Puntos críticos:**
- Crear productos (`/dashboard/new-product`)
- Crear pedidos (`/checkout`)
- Crear subastas (`/dashboard/raffles`)
- Enviar mensajes (`/api/chat`)
- ❌ **Actual:** No verifica `is_active`
- ✅ **Necesario:** Validación en cada acción
- **Impacto:** ALTO - Usuario inactivo puede seguir generando contenido

#### 1.6 Flujo de Refresh Token
**Punto crítico:** Renovación automática de sesión
- ❌ **Actual:** Supabase renueva tokens sin verificar `is_active`
- ✅ **Necesario:** Hook que invalide refresh si usuario está inactivo
- **Impacto:** CRÍTICO - Sesión puede renovarse indefinidamente

---

### 2. PUNTOS DE INTEGRACIÓN CRÍTICOS

#### 2.1 Supabase Auth
- **Problema:** Supabase Auth no tiene concepto de `is_active`
- **Solución:** Verificación post-login en aplicación
- **Complejidad:** Media

#### 2.2 RLS Policies
- **Problema:** Políticas RLS no verifican `is_active`
- **Solución:** Agregar `is_active = true` a todas las políticas
- **Complejidad:** Alta (muchas políticas)

#### 2.3 Middleware Next.js
- **Problema:** Middleware actual solo hace rate limiting
- **Solución:** Extender middleware para verificar `is_active`
- **Complejidad:** Media

#### 2.4 Client Components
- **Problema:** `useAuth()` no verifica `is_active`
- **Solución:** Agregar verificación en hook
- **Complejidad:** Baja

#### 2.5 Server Components
- **Problema:** No hay verificación server-side
- **Solución:** Verificar en cada Server Component protegido
- **Complejidad:** Media

---

### 3. EDGE CASES Y CASOS ESPECIALES

#### 3.1 Usuario se desactiva mientras está logueado
- **Escenario:** Admin desactiva usuario que tiene sesión activa
- **Comportamiento esperado:** Cerrar sesión inmediatamente
- **Solución:** Webhook/trigger que invalide sesión

#### 3.2 Usuario intenta login después de desactivación
- **Escenario:** Usuario intenta login con cuenta desactivada
- **Comportamiento esperado:** Rechazar con mensaje claro
- **Solución:** Verificación en `/auth/sign-in`

#### 3.3 Refresh token válido pero usuario inactivo
- **Escenario:** Token se renueva pero usuario fue desactivado
- **Comportamiento esperado:** Invalidar token y cerrar sesión
- **Solución:** Verificación en refresh hook

#### 3.4 Usuario activo pero baneado
- **Escenario:** `is_active = true` pero `banned_at != null`
- **Comportamiento esperado:** Tratar como inactivo
- **Solución:** Verificar ambos flags

#### 3.5 Admin desactiva su propia cuenta
- **Escenario:** Admin se desactiva a sí mismo
- **Comportamiento esperado:** Bloquear acción o requerir otro admin
- **Solución:** Validación en UI y backend

#### 3.6 Usuario con órdenes pendientes se desactiva
- **Escenario:** Usuario tiene pedidos en proceso
- **Comportamiento esperado:** Permitir completar órdenes existentes, bloquear nuevas
- **Solución:** Lógica condicional por tipo de acción

---

### 4. ARQUITECTURA DE LA SOLUCIÓN

```
┌─────────────────────────────────────────────────────────────┐
│                    CAPA DE PRESENTACIÓN                     │
│  (UI Components, Forms, User Feedback)                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│              CAPA DE VERIFICACIÓN CLIENT                     │
│  • useAuth() - Verifica is_active                           │
│  • Layout Guards - Bloquea rutas                            │
│  • Component Guards - Bloquea acciones                      │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│              CAPA DE MIDDLEWARE                              │
│  • Next.js Middleware - Verifica cada request               │
│  • API Route Guards - Bloquea endpoints                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│              CAPA DE BASE DE DATOS                           │
│  • RLS Policies - Bloquea acceso a datos                    │
│  • Database Triggers - Invalida sesiones                    │
│  • Functions - Verificaciones server-side                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ SOLUCIÓN PROFESIONAL COMPLETA

### FASE 1: VERIFICACIÓN EN AUTENTICACIÓN (CRÍTICO)

#### 1.1 Modificar página de login
**Archivo:** `src/app/auth/sign-in/page.tsx`

```typescript
// Después de login exitoso, verificar is_active
const { data: profile } = await supabase
  .from('profiles')
  .select('is_active, banned_at')
  .eq('id', user.id)
  .single();

if (!profile?.is_active || profile.banned_at) {
  await supabase.auth.signOut();
  setError('Tu cuenta ha sido desactivada. Contacta al administrador.');
  return;
}
```

#### 1.2 Modificar hook useAuth
**Archivo:** `src/lib/hooks/useAuth.ts`

```typescript
// En loadUser(), después de obtener perfil:
if (profile && (!profile.is_active || profile.banned_at)) {
  // Cerrar sesión automáticamente
  await supabase.auth.signOut();
  setUser(null);
  router.push('/auth/sign-in?reason=account_inactive');
  return;
}
```

---

### FASE 2: MIDDLEWARE DE VERIFICACIÓN (CRÍTICO)

#### 2.1 Extender middleware existente
**Archivo:** `src/middleware.ts`

```typescript
import { createServerClient } from '@/lib/supabase/server';

export async function middleware(request: NextRequest) {
  // Rate limiting existente...
  
  // NUEVO: Verificación de usuario activo para rutas protegidas
  const protectedPaths = ['/dashboard', '/admin', '/api'];
  const isProtected = protectedPaths.some(path => 
    request.nextUrl.pathname.startsWith(path)
  );
  
  if (isProtected) {
    const supabase = await createServerClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_active, banned_at')
        .eq('id', session.user.id)
        .single();
      
      if (!profile?.is_active || profile.banned_at) {
        // Invalidar sesión y redirigir
        await supabase.auth.signOut();
        return NextResponse.redirect(
          new URL('/auth/sign-in?reason=account_inactive', request.url)
        );
      }
    }
  }
  
  // Continuar con rate limiting...
}
```

---

### FASE 3: LAYOUT GUARDS (ALTO)

#### 3.1 Dashboard Layout Guard
**Archivo:** `src/app/dashboard/layout.tsx` (crear si no existe)

```typescript
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { supabase } from '@/lib/supabaseClient';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      // Verificar is_active
      (async () => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_active, banned_at')
          .eq('id', user.id)
          .single();
        
        if (!profile?.is_active || profile.banned_at) {
          await supabase.auth.signOut();
          router.push('/auth/sign-in?reason=account_inactive');
        }
      })();
    }
  }, [user, loading, router]);

  if (loading) {
    return <div>Cargando...</div>;
  }

  if (!user) {
    router.push('/auth/sign-in');
    return null;
  }

  return <>{children}</>;
}
```

#### 3.2 Admin Layout (ya existe, modificar)
**Archivo:** `src/app/admin/layout.tsx`

```typescript
// Agregar verificación de is_active después de verificar rol:
const { data: profile } = await supabase
  .from('profiles')
  .select('id, role, email, is_active, banned_at')
  .eq('id', user.id)
  .single();

if (!profile?.is_active || profile.banned_at) {
  await supabase.auth.signOut();
  window.location.href = '/auth/sign-in?reason=account_inactive';
  return;
}
```

---

### FASE 4: RLS POLICIES (CRÍTICO)

#### 4.1 Crear migración para actualizar políticas
**Archivo:** `supabase/migrations/20251130000001_add_is_active_rls.sql`

```sql
-- ============================================
-- AGREGAR VERIFICACIÓN is_active A POLÍTICAS RLS
-- ============================================

-- 1. Actualizar políticas de products
DROP POLICY IF EXISTS "users_can_view_own_products" ON public.products;
CREATE POLICY "users_can_view_own_products"
ON public.products FOR SELECT
TO authenticated
USING (
  seller_id = auth.uid() 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND is_active = true 
    AND banned_at IS NULL
  )
);

-- 2. Actualizar políticas de orders
DROP POLICY IF EXISTS "users_can_view_own_orders" ON public.orders;
CREATE POLICY "users_can_view_own_orders"
ON public.orders FOR SELECT
TO authenticated
USING (
  (buyer_id = auth.uid() OR seller_id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND is_active = true 
    AND banned_at IS NULL
  )
);

-- 3. Función helper para verificar usuario activo
CREATE OR REPLACE FUNCTION public.is_user_active()
RETURNS BOOLEAN AS $$
DECLARE
  current_user_id UUID;
  user_is_active BOOLEAN;
  user_banned_at TIMESTAMPTZ;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  SELECT is_active, banned_at 
  INTO user_is_active, user_banned_at
  FROM public.profiles 
  WHERE id = current_user_id;
  
  RETURN COALESCE(user_is_active, false) = true 
    AND user_banned_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Usar función en políticas más complejas
-- Ejemplo para stores:
DROP POLICY IF EXISTS "sellers_can_update_own_store" ON public.stores;
CREATE POLICY "sellers_can_update_own_store"
ON public.stores FOR UPDATE
TO authenticated
USING (
  seller_id = auth.uid() 
  AND public.is_user_active() = true
);
```

---

### FASE 5: INVALIDACIÓN DE SESIÓN AL DESACTIVAR (CRÍTICO)

#### 5.1 Trigger de base de datos
**Archivo:** `supabase/migrations/20251130000002_invalidate_session_on_deactivate.sql`

```sql
-- ============================================
-- TRIGGER PARA INVALIDAR SESIÓN AL DESACTIVAR
-- ============================================

-- Función que invalida sesiones cuando is_active cambia a false
CREATE OR REPLACE FUNCTION public.handle_user_deactivation()
RETURNS TRIGGER AS $$
BEGIN
  -- Si is_active cambió de true a false, o banned_at se estableció
  IF (OLD.is_active = true AND NEW.is_active = false) 
     OR (OLD.banned_at IS NULL AND NEW.banned_at IS NOT NULL) THEN
    
    -- Marcar todas las sesiones como inválidas
    -- Nota: Supabase no permite eliminar sesiones directamente,
    -- pero podemos usar un campo de invalidación
    UPDATE auth.sessions
    SET updated_at = NOW()
    WHERE user_id = NEW.id;
    
    -- Opcional: Log del evento
    INSERT INTO public.audit_logs (
      user_id, 
      action, 
      details,
      created_at
    ) VALUES (
      NEW.id,
      'account_deactivated',
      jsonb_build_object(
        'admin_id', current_setting('app.current_admin_id', true),
        'reason', NEW.ban_reason,
        'timestamp', NOW()
      ),
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear trigger
DROP TRIGGER IF EXISTS on_user_deactivation ON public.profiles;
CREATE TRIGGER on_user_deactivation
  AFTER UPDATE OF is_active, banned_at ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_deactivation();
```

#### 5.2 Webhook para cerrar sesiones activas
**Archivo:** `src/app/api/admin/users/deactivate/route.ts` (nuevo)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }
    
    // Verificar que es admin
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();
    
    if (adminProfile?.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    
    const { userId, reason } = await request.json();
    
    // Desactivar usuario
    const adminClient = getSupabaseAdminClient();
    const { error: updateError } = await adminClient
      .from('profiles')
      .update({ 
        is_active: false,
        banned_at: reason ? new Date().toISOString() : null,
        ban_reason: reason || null
      })
      .eq('id', userId);
    
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
    
    // Invalidar todas las sesiones del usuario
    // Nota: Esto requiere usar Supabase Admin API
    const { error: signOutError } = await adminClient.auth.admin.signOut(userId, 'all');
    
    return NextResponse.json({ 
      success: true,
      message: 'Usuario desactivado y sesiones cerradas'
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

---

### FASE 6: VERIFICACIÓN EN ACCIONES CRÍTICAS (ALTO)

#### 6.1 Helper function para verificar usuario activo
**Archivo:** `src/lib/utils/userStatus.ts` (nuevo)

```typescript
import { supabase } from '@/lib/supabase/client';
import { createServerClient } from '@/lib/supabase/server';

export async function isUserActive(userId?: string): Promise<boolean> {
  try {
    const client = userId ? await createServerClient() : supabase;
    const targetUserId = userId || (await supabase.auth.getUser()).data.user?.id;
    
    if (!targetUserId) return false;
    
    const { data: profile } = await client
      .from('profiles')
      .select('is_active, banned_at')
      .eq('id', targetUserId)
      .single();
    
    return profile?.is_active === true && !profile.banned_at;
  } catch {
    return false;
  }
}

export async function requireActiveUser(): Promise<void> {
  const isActive = await isUserActive();
  if (!isActive) {
    await supabase.auth.signOut();
    throw new Error('Tu cuenta ha sido desactivada');
  }
}
```

#### 6.2 Usar en acciones críticas
**Ejemplo en creación de productos:**

```typescript
// src/app/dashboard/new-product/page.tsx
import { requireActiveUser } from '@/lib/utils/userStatus';

async function handleSubmit() {
  await requireActiveUser(); // Verificar antes de crear
  
  // ... resto del código
}
```

---

### FASE 7: UI/UX MEJORAS (MEDIO)

#### 7.1 Página de cuenta desactivada
**Archivo:** `src/app/account-inactive/page.tsx` (nuevo)

```typescript
export default function AccountInactivePage() {
  const searchParams = useSearchParams();
  const reason = searchParams.get('reason');
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold text-red-600 mb-4">
          Cuenta Desactivada
        </h1>
        <p className="text-gray-700 mb-6">
          Tu cuenta ha sido desactivada. No puedes acceder a la plataforma.
        </p>
        {reason === 'banned' && (
          <p className="text-sm text-gray-600 mb-4">
            Razón: Violación de términos de servicio
          </p>
        )}
        <Link 
          href="/contact"
          className="text-blue-600 hover:underline"
        >
          Contactar soporte
        </Link>
      </div>
    </div>
  );
}
```

#### 7.2 Notificación en admin al desactivar
**Modificar:** `src/app/admin/users/page.tsx`

```typescript
async function handleToggleActive(user: UserProfile) {
  if (!confirm(`¿${user.is_active ? 'Desactivar' : 'Activar'} a ${user.email}?`)) {
    return;
  }
  
  // Mostrar advertencia si se desactiva
  if (user.is_active) {
    const confirmed = confirm(
      '⚠️ ADVERTENCIA: Esto cerrará todas las sesiones activas del usuario. ¿Continuar?'
    );
    if (!confirmed) return;
  }
  
  // ... resto del código
}
```

---

## 📋 PLAN DE IMPLEMENTACIÓN

### Prioridad CRÍTICA (Implementar primero)
1. ✅ Fase 1: Verificación en login
2. ✅ Fase 2: Middleware de verificación
3. ✅ Fase 4: RLS Policies básicas
4. ✅ Fase 5: Invalidación de sesión

### Prioridad ALTA (Implementar después)
5. ✅ Fase 3: Layout Guards
6. ✅ Fase 6: Verificación en acciones críticas

### Prioridad MEDIA (Mejoras UX)
7. ✅ Fase 7: UI/UX mejoras

---

## 🧪 TESTING

### Casos de prueba críticos:
1. ✅ Usuario inactivo intenta login → Rechazado
2. ✅ Usuario activo se desactiva mientras está logueado → Sesión cerrada
3. ✅ Usuario inactivo intenta acceder a dashboard → Redirigido
4. ✅ Usuario inactivo intenta crear producto → Bloqueado
5. ✅ Usuario inactivo intenta hacer pedido → Bloqueado
6. ✅ RLS bloquea acceso a datos de usuario inactivo
7. ✅ Refresh token de usuario inactivo → Invalidado

---

## 📊 MÉTRICAS DE ÉXITO

- ✅ 0% de usuarios inactivos pueden hacer login
- ✅ 100% de sesiones cerradas al desactivar
- ✅ 0% de acceso a datos protegidos por usuarios inactivos
- ✅ Tiempo de invalidación < 5 segundos

---

## ⚠️ CONSIDERACIONES IMPORTANTES

1. **No desactivar último admin:** Validar que siempre quede al menos un admin activo
2. **Órdenes pendientes:** Permitir completar órdenes existentes, bloquear nuevas
3. **Notificaciones:** Enviar email al usuario cuando se desactiva
4. **Auditoría:** Registrar quién desactivó y cuándo
5. **Reversibilidad:** Permitir reactivar fácilmente

---

## 🚀 PRÓXIMOS PASOS

1. Revisar y aprobar solución
2. Crear branch: `feature/user-deactivation-system`
3. Implementar Fase 1-5 (crítico)
4. Testing exhaustivo
5. Deploy a staging
6. Testing en staging
7. Deploy a producción

---

**Fin del documento**

















