# 📦 Guía para Instalar Node.js 20 en Windows

## ❌ Situación Actual
- **nvm no está instalado** en tu sistema Windows
- **Node.js actual**: v22.20.0
- **Requerido**: Node.js 20.x

## ✅ Opciones para Cambiar a Node.js 20

### Opción 1: Instalar nvm-windows (Recomendado para múltiples versiones)

**Pasos**:
1. Descargar e instalar nvm-windows desde: https://github.com/coreybutler/nvm-windows/releases
2. Descargar el archivo `nvm-setup.exe` (la última versión)
3. Ejecutar el instalador
4. Reiniciar PowerShell/Terminal
5. Ejecutar:
   ```powershell
   nvm install 20
   nvm use 20
   node -v  # Debe mostrar v20.x.x
   ```

**Ventajas**: Permite cambiar entre versiones fácilmente

---

### Opción 2: Instalar Node.js 20 directamente (Más rápido)

**Pasos**:
1. Ir a: https://nodejs.org/
2. Descargar la versión **LTS 20.x** (actualmente 20.18.0 o similar)
3. Ejecutar el instalador
4. Aceptar sobrescribir la instalación actual
5. Verificar:
   ```powershell
   node -v  # Debe mostrar v20.x.x
   ```

**Ventajas**: Instalación rápida, una sola versión

---

### Opción 3: Usar Chocolatey (Si ya lo tienes)

```powershell
choco uninstall nodejs
choco install nodejs-lts --version=20.18.0
node -v
```

---

## 🔍 Verificar Instalación

Después de instalar Node.js 20, verifica:

```powershell
node -v    # Debe mostrar v20.x.x (NO v22.x.x)
npm -v     # Debe funcionar correctamente
```

## 📝 Nota Importante

**El build ya pasó con Node 22**, pero para cumplir con el requisito del proyecto (`"engines": { "node": "20.x" }`), es recomendable usar Node 20 para evitar posibles incompatibilidades futuras.

## 🚀 Siguiente Paso

Una vez que tengas Node 20 instalado, puedes ejecutar:

```powershell
cd C:\Users\PCera\mercadito-online-py
npm run build
npm run start
```

## ⚠️ Si Prefieres Seguir con Node 22

Si necesitas seguir usando Node 22 temporalmente, el proyecto debería funcionar, pero ten en cuenta que:
- El `package.json` especifica `"engines": { "node": "20.x" }`
- Podrían surgir incompatibilidades en el futuro
- Es mejor migrar a Node 20 cuando sea posible












