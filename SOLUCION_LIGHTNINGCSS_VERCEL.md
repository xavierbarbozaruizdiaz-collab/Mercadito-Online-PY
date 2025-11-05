# 🔧 Solución: Error de lightningcss en Vercel

## ❌ Problema

El deployment falla con el error:
```
Error: Cannot find module '../lightningcss.linux-x64-gnu.node'
```

Esto ocurre porque `lightningcss` (dependencia de Tailwind CSS v4) requiere binarios nativos que no se instalan correctamente en Vercel.

## ✅ Soluciones

### Opción 1: Instalar lightningcss explícitamente (RECOMENDADO)

Agregar `lightningcss` como dependencia explícita en `package.json`:

```json
{
  "dependencies": {
    "lightningcss": "^1.27.0"
  }
}
```

Luego ejecutar:
```bash
npm install
```

### Opción 2: Usar Tailwind CSS v3 (Alternativa)

Si el problema persiste, considerar downgrade a Tailwind CSS v3:

```bash
npm uninstall tailwindcss @tailwindcss/postcss
npm install -D tailwindcss@^3 postcss autoprefixer
```

### Opción 3: Configurar Vercel para instalar binarios nativos

Agregar a `vercel.json`:

```json
{
  "installCommand": "npm install --ignore-scripts=false",
  "buildCommand": "npm run build"
}
```

Y en `package.json`:

```json
{
  "scripts": {
    "postinstall": "npm rebuild lightningcss --no-save || npm install lightningcss --no-save"
  }
}
```

### Opción 4: Usar .vercelignore para excluir node_modules problemáticos

Crear `.vercelignore`:

```
node_modules/lightningcss
```

Y luego reinstalar en el build.

## 🎯 Próximos Pasos

1. Probar Opción 1 primero (instalar lightningcss explícitamente)
2. Si falla, probar Opción 3 (configurar installCommand)
3. Como último recurso, considerar Opción 2 (downgrade a Tailwind v3)

## 📝 Notas

- Este es un problema conocido con Tailwind CSS v4 y entornos de build que usan binarios nativos
- Vercel debería manejar esto automáticamente, pero a veces necesita configuración explícita
- El problema puede estar relacionado con la versión de Node.js o la arquitectura del servidor de build

