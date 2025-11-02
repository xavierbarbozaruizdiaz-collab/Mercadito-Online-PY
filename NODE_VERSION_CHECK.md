# 🔍 Estado Actual del Sistema

## Versión de Node.js
- **Actual**: `v22.20.0`
- **Requerida**: `v20.x`

## Gestor de Versiones
- **nvm**: ❌ No instalado
- **nvm-windows**: ❌ No instalado

## Opciones Disponibles

### ✅ Opción Recomendada: Instalar Node.js 20 directamente
1. Descarga desde: https://nodejs.org/en/download/
2. Selecciona la versión **LTS 20.x** (Windows Installer)
3. Instala y sobrescribe la versión actual

### 🔄 Alternativa: Instalar nvm-windows
Si necesitas gestionar múltiples versiones de Node:
1. Descarga nvm-windows: https://github.com/coreybutler/nvm-windows/releases
2. Instala `nvm-setup.exe`
3. Reinicia PowerShell
4. Ejecuta: `nvm install 20 && nvm use 20`

## ⚠️ Importante
El build ya funcionó con Node 22, pero el proyecto especifica Node 20.x en `package.json`. Es recomendable usar Node 20 para evitar incompatibilidades.


