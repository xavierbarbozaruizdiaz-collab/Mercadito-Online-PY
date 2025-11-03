# 🔬 GUÍA COMPLETA DE DIAGNÓSTICO

## 🎯 Objetivo
Identificar la causa raíz de las diferencias visuales entre local y producción.

---

## 📋 Scripts de Diagnóstico Disponibles

### 1. **Diagnóstico Profundo**
```bash
npm run diagnostico:profundo
```
**Qué hace:**
- Analiza configuración de Next.js
- Verifica Tailwind en detalle
- Compara variables de entorno
- Encuentra componentes con clases dinámicas
- Verifica modo de renderizado

### 2. **Análisis de Componentes Dinámicos**
```bash
npm run analizar:componentes-dinamicos
```
**Qué hace:**
- Encuentra todos los archivos con clases dinámicas
- Extrae las clases dinámicas usadas
- Verifica si están en safelist
- Identifica clases faltantes

### 3. **Verificar Clases en CSS**
```bash
npm run verificar:clases-css
```
**Qué hace:**
- Lee el CSS generado
- Compara clases usadas vs clases en CSS
- Verifica clases críticas de componentes UI
- Identifica clases faltantes

### 4. **Verificar Diferencias en Render**
```bash
npm run verificar:diferencias-render
```
**Qué hace:**
- Compara variables de entorno local vs producción
- Encuentra feature flags en código
- Verifica configuración de caché
- Analiza Server vs Client Components

### 5. **Verificación Completa de Producción**
```bash
npm run verificar:produccion
```
**Qué hace:**
- Verifica build
- Verifica rutas
- Verifica Tailwind
- Verifica configuración
- Verifica variables de entorno
- Verifica Vercel config

### 6. **Comparar Renders**
```bash
node scripts/comparar-renders.js
```
**Qué hace:**
- Analiza HTML generado
- Extrae clases del HTML
- Compara con CSS generado
- Identifica discrepancias

---

## 🔍 Problemas Encontrados Hasta Ahora

### 1. ✅ **optimizeCss** (CORREGIDO)
- **Estado:** Deshabilitado en todos los archivos de config
- **Impacto:** CRÍTICO - Eliminaba clases dinámicas

### 2. ⚠️ **NEXT_PUBLIC_APP_ENV Diferente**
- **Local:** `development`
- **Producción:** `production`
- **Impacto:** ALTO - Puede cambiar comportamiento

### 3. ⚠️ **NEXT_PUBLIC_FEATURE_HERO**
- **Local:** `true`
- **Producción:** `NO DEFINIDA`
- **Impacto:** MEDIO - Puede ocultar hero en producción

### 4. ⚠️ **Clases Dinámicas**
- **7+ archivos** usan clases dinámicas
- **Impacto:** ALTO - Clases pueden no estar en CSS

### 5. ⚠️ **output: standalone**
- **Estado:** Habilitado
- **Impacto:** MEDIO - Puede afectar paths de assets

---

## 🎯 Estrategia de Diagnóstico

### Paso 1: Ejecutar Todos los Scripts
```bash
npm run diagnostico:profundo
npm run analizar:componentes-dinamicos
npm run verificar:clases-css
npm run verificar:diferencias-render
npm run verificar:produccion
```

### Paso 2: Revisar Output
- Identificar problemas comunes
- Priorizar por impacto
- Documentar hallazgos

### Paso 3: Aplicar Correcciones
- Corregir problemas encontrados
- Rebuild y verificar
- Documentar cambios

### Paso 4: Verificar en Producción
- Desplegar correcciones
- Comparar local vs producción
- Verificar que se resolvieron

---

## 📊 Checklist de Verificación

### Antes de Deploy
- [ ] Todos los scripts de verificación pasan
- [ ] optimizeCss deshabilitado
- [ ] Clases dinámicas en safelist
- [ ] Variables de entorno alineadas
- [ ] Build funciona correctamente

### Después de Deploy
- [ ] Verificar en producción visualmente
- [ ] Comparar HTML generado
- [ ] Comparar CSS cargado
- [ ] Verificar Network tab
- [ ] Verificar Console por errores

---

## 💡 Próximos Pasos Si Persisten Diferencias

1. **Comparar HTML completo**
   - Copiar HTML de producción
   - Comparar con HTML local
   - Identificar diferencias

2. **Comparar CSS completo**
   - Descargar CSS de producción
   - Comparar con CSS local
   - Identificar clases faltantes

3. **Verificar datos de base de datos**
   - Comparar datos locales vs producción
   - Verificar que sean similares

4. **Verificar timing de carga**
   - Verificar orden de carga de recursos
   - Verificar que CSS se carga antes del render

---

**Última actualización:** $(date)

