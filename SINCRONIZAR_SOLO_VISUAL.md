# 🎨 Sincronizar SOLO Código Visual (Sin tocar Datos)

## ⚡ Método Rápido

```bash
npm run sync:git-from-prod
```

Eso es todo. Esto trae el código visual de producción a local, **SIN tocar la base de datos**.

---

## 📋 Qué hace exactamente

✅ **Sincroniza:**
- Componentes React (`.tsx`, `.ts`)
- Páginas (`src/app/**/*.tsx`)
- Estilos CSS
- Configuración (`next.config.ts`, `tailwind.config`, etc.)
- Dependencias (`package.json`)

❌ **NO toca:**
- Base de datos de producción
- Base de datos local
- Datos de productos, pedidos, categorías
- Usuarios/perfiles
- Storage de imágenes

---

## 🔄 Proceso Detallado

### Paso 1: Ver qué cambió
```bash
git fetch origin
git diff HEAD origin/dev --name-only
```

### Paso 2: Sincronizar
```bash
npm run sync:git-from-prod
```

O manualmente:
```bash
git fetch origin
git merge origin/dev
```

### Paso 3: Instalar dependencias (si cambió package.json)
```bash
npm install
```

### Paso 4: Probar
```bash
npm run dev
```

---

## ⚠️ Si tienes cambios locales

### Opción A: Guardar cambios primero
```bash
git add .
git commit -m "Mis cambios locales"
npm run sync:git-from-prod
```

### Opción B: Descarta cambios locales
```bash
git reset --hard origin/dev
```

### Opción C: Stash (guardar temporalmente)
```bash
git stash
npm run sync:git-from-prod
git stash pop  # Recuperar tus cambios después
```

---

## 🐛 Conflictos

Si hay conflictos al hacer merge:

```bash
# 1. Ver archivos con conflictos
git status

# 2. Resolver manualmente cada archivo
# (busca <<<<<<< HEAD en los archivos)

# 3. Marcar como resuelto
git add archivo-resuelto.tsx

# 4. Finalizar merge
git commit
```

---

## ✅ Verificar que funcionó

```bash
# Ver que estás sincronizado
git diff HEAD origin/dev
# Si no hay salida, está sincronizado

# Verificar que la app funciona
npm run dev
```

---

## 📝 Notas

- Los datos locales (productos, pedidos, etc.) **NO se modifican**
- Solo se actualizan los **archivos de código**
- Puedes ejecutar esto **cuantas veces quieras** sin problemas
- Es seguro porque **NO toca producción** (solo lee de Git)

---

**Última actualización:** Ahora

