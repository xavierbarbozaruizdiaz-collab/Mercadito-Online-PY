# 🔧 Generar Tipos de Supabase y Eliminar @ts-ignore

## Paso 1: Login y Link del Proyecto Supabase

```bash
# 1. Login (abre navegador)
npx supabase login

# 2. Obtener Project Ref:
# - Ve a https://supabase.com/dashboard
# - Selecciona tu proyecto
# - Settings → API
# - Copia el "Reference ID" (ej: hqdatzhliaordlsqtjea)

# 3. Link del proyecto
npx supabase link --project-ref <TU_PROJECT_REF>

# Ejemplo:
# npx supabase link --project-ref hqdatzhliaordlsqtjea
```

## Paso 2: Generar Tipos

```bash
npm run typegen
```

Esto ejecutará:
```bash
supabase gen types typescript --linked > src/types/supabase.ts
```

## Paso 3: Actualizar Imports

Los tipos se guardarán en `src/types/supabase.ts`. Luego actualizar los archivos que usan `@ts-ignore`:

### Archivos a actualizar:
1. `src/app/admin/reports/page.tsx`
2. `src/app/api/whatsapp/notify-seller/route.ts`
3. `src/app/admin/orders/page.tsx`

## Paso 4: Reemplazar @ts-ignore

Después de generar los tipos, se puede usar:

```typescript
import type { Database } from '@/types/supabase';

type ReportsRow = Database['public']['Tables']['reports']['Row'];
type ReportsUpdate = Database['public']['Tables']['reports']['Update'];
```

