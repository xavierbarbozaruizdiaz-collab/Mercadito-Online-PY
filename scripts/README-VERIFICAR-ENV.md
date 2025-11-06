# 🔍 Verificador de Variables de Entorno

Script para verificar y comparar variables de entorno entre localhost y producción (Vercel).

## 📋 Uso

### Ejecutar el script

```bash
npm run verify:env
```

O directamente:

```bash
node scripts/verificar-env-vars.js
```

## 🎯 Qué hace

1. **Lee tus variables locales**: Busca en `.env.local` o `.env` en la raíz del proyecto
2. **Categoriza las variables**:
   - 🔴 **Críticas**: Sin ellas la app NO funciona
   - 🟡 **Importantes**: Funcionalidad reducida sin ellas
   - 🔵 **Opcionales**: Pueden causar diferencias visuales/funcionales
   - 💳 **Pagos**: Solo si usas algún gateway de pago
   - 📱 **WhatsApp**: Solo si usas notificaciones WhatsApp

3. **Genera un reporte** mostrando:
   - Qué variables están configuradas localmente
   - Cuáles faltan
   - Cuáles deben coincidir entre local y producción
   - Cuáles pueden/m deben ser diferentes

4. **Crea un checklist** para verificar en Vercel

## 📝 Próximos Pasos

Después de ejecutar el script:

1. Ve a [Vercel Dashboard](https://vercel.com/dashboard) → Tu Proyecto → **Settings** → **Environment Variables**

2. Compara cada variable mostrada en el reporte

3. Verifica que:
   - Las variables críticas estén presentes en Vercel
   - Las variables tengan los mismos valores (excepto las marcadas como "diferencia esperada")
   - Agregues cualquier variable que falte en Vercel

4. Usa el checklist generado al final del reporte para marcar lo que ya verificaste

## ✅ Variables con Diferencia Esperada

Estas variables **DEBEN** ser diferentes entre local y producción:

- `NEXT_PUBLIC_APP_URL`: 
  - Local: `http://localhost:3000`
  - Prod: `https://mercadito-online-py.vercel.app`

- `NEXT_PUBLIC_APP_ENV`:
  - Local: `development`
  - Prod: `production`

## 🔒 Seguridad

El script muestra los valores enmascarados para proteger información sensible:
- Muestra los primeros 8 caracteres
- Muestra los últimos 4 caracteres
- Oculta el resto con `...`

Ejemplo: `eyJhbGci...5qRw`

## 📊 Interpretación del Reporte

### ✅ Presente
Variable configurada localmente. Verifica que esté también en Vercel con el mismo valor.

### ❌ FALTANTE
Variable crítica que no está configurada. **La app NO funcionará sin ella**.

### ⚠️ Opcional
Variable importante que no está configurada. Algunas funcionalidades pueden no trabajar.

### ⚪ No configurada
Variable opcional que no está configurada. No es crítica pero puede causar diferencias.

## 🐛 Troubleshooting

### No se encuentran variables de entorno

El script busca en:
1. `.env.local` (prioridad)
2. `.env`
3. `process.env` (variables del sistema)

Si tienes variables en otro lugar:
- Crea un `.env.local` en la raíz del proyecto
- O configura las variables como variables de sistema

### El script no se ejecuta

Asegúrate de tener Node.js instalado:
```bash
node --version
```

Debería mostrar `v20.x` o superior.

## 📚 Más Información

- [Documentación de Vercel - Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Guía de Variables de Entorno del Proyecto](./../GUIA_VARIABLES_ENTORNO.md)

