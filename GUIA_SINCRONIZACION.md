# 🚀 Guía de Sincronización: PRODUCCIÓN ↔ LOCAL

## 📋 Resumen

⚠️ **IMPORTANTE: Esta guía es SOLO para sincronizar CÓDIGO VISUAL. NO toca datos de producción.**

Esta guía te ayudará a sincronizar el **código** (componentes, páginas, estilos) desde PRODUCCIÓN a LOCAL usando Git.

---

## ⚙️ Configuración Inicial (Solo una vez)

### Paso 1: Instalar dependencias

```bash
npm install
```

### Paso 2: Verificar Git

Asegúrate de tener configurado el remoto:

```bash
git remote -v
```

Si no tienes remoto, agrégalo:

```bash
git remote add origin https://github.com/tu-usuario/tu-repo.git
```

---

## 🔄 Sincronizar CÓDIGO VISUAL (SOLO)

### Método Automático (Recomendado)

```bash
npm run sync:git-from-prod
```

Este script:
- ✅ Trae cambios de la rama de producción (por defecto `dev`)
- ✅ Muestra diferencias antes de sincronizar
- ✅ Hace merge automático
- ✅ **NO toca la base de datos**

---

### Método Manual (Más Control)

Si prefieres hacerlo manualmente:

```bash
# 1. Ver qué cambió en producción
git fetch origin

# 2. Ver diferencias (sin aplicar cambios)
git diff HEAD origin/dev

# 3. Ver qué archivos cambiaron
git diff HEAD origin/dev --name-only

# 4. Traer cambios (solo código, NO datos)
git merge origin/dev

# O si prefieres rebase (recomendado si tienes cambios locales):
git rebase origin/dev
```

---

## 📊 Flujo Completo Recomendado

### Para igualar LOCAL a PRODUCCIÓN (SOLO CÓDIGO):

```bash
# 1. Guardar cambios locales (si los tienes)
git add .
git commit -m "Guardar cambios locales antes de sync"

# 2. Sincronizar código visual desde producción
npm run sync:git-from-prod

# 3. Instalar dependencias (si hay cambios en package.json)
npm install

# 4. Probar la aplicación
npm run dev
```

⚠️ **NOTA:** Este proceso NO toca la base de datos. Los datos locales se mantienen intactos.

---

## 🔍 Verificar Sincronización

### Verificar código visual:

```bash
# Ver diferencias con producción
git fetch origin
git diff HEAD origin/dev

# Si no hay salida, están sincronizados
```

---

## ⚠️ Advertencias Importantes

### ⛔ NO hagas esto:
- ❌ `npm run sync:import-prod` - NO usar (toca datos de producción)
- ❌ `npm run sync:prod-to-local` - NO usar (sincroniza datos)
- ❌ Hacer push sin revisar cambios
- ❌ Usar variables de producción en desarrollo local

### ✅ SÍ haz esto:
- ✅ Usar `npm run sync:git-from-prod` para código visual
- ✅ Revisar diferencias antes de merge
- ✅ Hacer commit de cambios locales antes de sincronizar
- ✅ Probar localmente después de sincronizar

---

## 🐛 Solución de Problemas

### Error: "Variables de entorno no encontradas"
```bash
# Verifica que existan:
ls -la .env.local .env.production

# Si no existen, créalos desde los ejemplos:
cp env.example .env.local
cp .env.production.example .env.production
```

### Error: "No se puede conectar"
```bash
# Verifica las URLs y keys en:
cat .env.local
cat .env.production

# Verifica que sean correctas en Supabase Dashboard
```

### Error: "Foreign key constraint"
```bash
# Algunas tablas tienen dependencias
# El script ya las maneja en orden, pero si falla:
# 1. Limpia manualmente las tablas dependientes
# 2. O importa en orden: categories → products → product_images
```

### Conflictos en Git
```bash
# Si hay conflictos al hacer merge:
git status
# Resuelve manualmente los archivos con conflictos
git add .
git commit
```

---

## 📁 Archivos Importantes

- `scripts/sync-prod-to-local.js` - Sincronización directa
- `scripts/export-data.js` - Exportar datos
- `scripts/import-data.js` - Importar datos
- `scripts/sync-git.js` - Sincronizar código
- `scripts/data-export/` - Archivos JSON exportados (ignorado en git)
- `.env.production` - Variables de producción (ignorado en git)
- `.env.local` - Variables de local (ignorado en git)

---

## 🎯 Casos de Uso

### Caso 1: "Quiero que LOCAL tenga el mismo código visual que PRODUCCIÓN"
```bash
npm run sync:git-from-prod    # Sincroniza solo código visual
```

### Caso 2: "Quiero ver qué cambió en PRODUCCIÓN sin aplicar cambios"
```bash
git fetch origin
git diff HEAD origin/dev      # Ver diferencias
git diff HEAD origin/dev --name-only  # Solo nombres de archivos
```

### Caso 3: "Tengo cambios locales y quiero traer cambios de producción"
```bash
# Opción A: Merge (mantiene tu historial)
git fetch origin
git merge origin/dev

# Opción B: Rebase (historial más limpio)
git fetch origin
git rebase origin/dev
```

### Caso 4: "Quiero descartar cambios locales y usar producción"
```bash
git fetch origin
git reset --hard origin/dev   # ⚠️ CUIDADO: Elimina cambios locales
```

---

## 📝 Notas Importantes

- ⚠️ **SOLO sincroniza código visual** (archivos .tsx, .ts, .css, etc.)
- ✅ **NO toca la base de datos** de producción ni local
- ✅ **NO afecta datos** (productos, pedidos, categorías, etc.)
- ✅ Puedes ejecutar el script **múltiples veces** sin problemas
- ✅ Tus datos locales se **mantienen intactos**

---

## 🆘 ¿Necesitas ayuda?

1. Revisa `scripts/README.md` para más detalles
2. Verifica los logs de los scripts (muestran errores)
3. Revisa que las variables de entorno estén correctas
4. Verifica permisos RLS en Supabase

---

**Última actualización:** Ahora
**Versión:** 1.0.0

