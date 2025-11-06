# PARCHES PARA CORRECCIÓN DE INTEGRACIÓN GTM

Este directorio contiene los diffs propuestos para corregir problemas detectados en la auditoría de GTM.

## Orden de Aplicación Recomendado

### Prioridad Alta (Aplicar primero):

1. **diff-1-eliminar-ga4-directo.patch**
   - Elimina GA4 directo del layout principal
   - Evita duplicación con GA4 vía GTM
   - **CRÍTICO**: Aplicar antes de cualquier otro patch

2. **diff-2-prevenir-duplicacion-gtm-tiendas.patch**
   - Previne duplicación de GTM en páginas de tienda
   - Solo carga GTM de tienda si es diferente del principal

3. **diff-3-prevenir-duplicacion-ga4-tiendas.patch**
   - Previne duplicación de GA4 en páginas de tienda
   - Solo carga GA4 de tienda si es diferente del global

### Prioridad Media:

4. **diff-4-reforzar-checks-ga4-servicios.patch**
   - Reforza checks en servicios para evitar carga duplicada
   - Defensivo, pero recomendado

### Prioridad Baja (Opcional):

5. **diff-5-opcional-mover-fb-pixel-a-gtm.patch**
   - Solo aplicar si Facebook Pixel está configurado en GTM
   - Centraliza todo el tracking en GTM

## Cómo Aplicar los Patches

### Opción 1: Aplicar manualmente

1. Leer el contenido del patch
2. Aplicar los cambios manualmente en el archivo correspondiente
3. Verificar que no haya errores de sintaxis

### Opción 2: Usar `git apply` (si los patches están en formato git)

```bash
# Desde la raíz del proyecto
git apply PATCHES_GTM/diff-1-eliminar-ga4-directo.patch
git apply PATCHES_GTM/diff-2-prevenir-duplicacion-gtm-tiendas.patch
git apply PATCHES_GTM/diff-3-prevenir-duplicacion-ga4-tiendas.patch
git apply PATCHES_GTM/diff-4-reforzar-checks-ga4-servicios.patch
```

### Opción 3: Aplicar cambios directamente

Los cambios son pequeños y se pueden aplicar directamente editando los archivos.

## Verificación Post-Patch

Después de aplicar los patches:

1. **Tag Assistant**:
   - Abrir la URL de producción/staging
   - Verificar que solo hay 1 contenedor GTM (GTM-PQ8Q6JGW)
   - Verificar que no hay scripts GA4 duplicados

2. **GA4 DebugView**:
   - Verificar que solo hay 1 pageview por carga
   - Verificar que eventos e-commerce no están duplicados

3. **Console del navegador**:
   - Verificar que no hay errores de scripts
   - Verificar que `window.dataLayer` existe y tiene eventos

## Notas Importantes

- **PATCH 1 es CRÍTICO**: Debe aplicarse primero para evitar duplicación de GA4
- **PATCH 5 es OPCIONAL**: Solo aplicar si Facebook Pixel está en GTM
- Los patches están en formato unified diff estándar
- Si hay conflictos al aplicar, revisar manualmente el archivo

