#!/usr/bin/env node

/**
 * ============================================
 * DIAGNÓSTICO DE DIFERENCIAS VISUALES
 * Entre Localhost y Producción
 * ============================================
 * 
 * Este script identifica las posibles causas de diferencias visuales
 * entre el entorno local y producción.
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 DIAGNÓSTICO DE DIFERENCIAS VISUALES\n');
console.log('='.repeat(60));
console.log('');

// ============================================
// 1. VERIFICAR CONFIGURACIÓN DE TAILWIND
// ============================================
console.log('📋 1. VERIFICANDO CONFIGURACIÓN DE TAILWIND...\n');

const tailwindConfigPath = path.join(process.cwd(), 'tailwind.config.js');
if (fs.existsSync(tailwindConfigPath)) {
  const tailwindConfig = require(tailwindConfigPath);
  
  console.log('✅ Tailwind config encontrado');
  console.log(`   - Content paths: ${JSON.stringify(tailwindConfig.content || [])}`);
  console.log(`   - Safelist items: ${tailwindConfig.safelist?.length || 0} clases`);
  console.log(`   - Dark mode: ${tailwindConfig.darkMode || 'no configurado'}`);
  
  // Verificar si content paths incluyen todos los directorios necesarios
  const contentPaths = tailwindConfig.content || [];
  const requiredPaths = [
    './src/pages/**/*',
    './src/components/**/*',
    './src/app/**/*'
  ];
  
  const missingPaths = requiredPaths.filter(reqPath => {
    return !contentPaths.some(cPath => cPath.includes(reqPath.split('/')[2]));
  });
  
  if (missingPaths.length > 0) {
    console.log('⚠️  ADVERTENCIA: Algunos paths pueden estar faltando en content:');
    missingPaths.forEach(p => console.log(`   - ${p}`));
  }
  
  console.log('');
} else {
  console.log('❌ tailwind.config.js no encontrado\n');
}

// ============================================
// 2. VERIFICAR CONFIGURACIÓN DE NEXT.JS
// ============================================
console.log('📋 2. VERIFICANDO CONFIGURACIÓN DE NEXT.JS...\n');

const nextConfigPath = path.join(process.cwd(), 'next.config.js');
if (fs.existsSync(nextConfigPath)) {
  const nextConfig = require(nextConfigPath);
  
  console.log('✅ Next.js config encontrado');
  console.log(`   - optimizeCss: ${nextConfig.experimental?.optimizeCss || false}`);
  console.log(`   - output: ${nextConfig.output || 'default'}`);
  console.log(`   - compress: ${nextConfig.compress || false}`);
  
  if (nextConfig.experimental?.optimizeCss) {
    console.log('⚠️  ADVERTENCIA: optimizeCss está habilitado - puede eliminar estilos no usados');
  }
  
  console.log('');
} else {
  console.log('❌ next.config.js no encontrado\n');
}

// ============================================
// 3. VERIFICAR VARIABLES CSS
// ============================================
console.log('📋 3. VERIFICANDO VARIABLES CSS...\n');

const globalsCssPath = path.join(process.cwd(), 'src/app/globals.css');
if (fs.existsSync(globalsCssPath)) {
  const cssContent = fs.readFileSync(globalsCssPath, 'utf8');
  
  console.log('✅ globals.css encontrado');
  
  // Buscar variables CSS
  const cssVars = cssContent.match(/--[a-z-]+:\s*[^;]+/g) || [];
  console.log(`   - Variables CSS encontradas: ${cssVars.length}`);
  
  // Verificar si hay media queries para dark mode
  if (cssContent.includes('@media (prefers-color-scheme: dark)')) {
    console.log('   - Dark mode CSS detectado (prefers-color-scheme)');
  }
  
  // Verificar si hay @import de tailwindcss
  if (cssContent.includes('@import "tailwindcss"')) {
    console.log('   - Tailwind CSS importado correctamente');
  } else {
    console.log('⚠️  ADVERTENCIA: @import "tailwindcss" no encontrado');
  }
  
  console.log('');
} else {
  console.log('❌ globals.css no encontrado\n');
}

// ============================================
// 4. VERIFICAR CLASES DINÁMICAS
// ============================================
console.log('📋 4. BUSCANDO CLASES DINÁMICAS (POTENCIAL PROBLEMA)...\n');

const srcDir = path.join(process.cwd(), 'src');
const problematicPatterns = [
  /className\s*=\s*\{[^}]*\s*\+[^}]+\}/g,  // Concatenación de strings
  /className\s*=\s*\{`[^`]*\$\{/g,  // Template literals
  /className\s*=\s*\{[^}]*\?\s*[^}]*:[^}]*\}/g,  // Operadores ternarios
];

let foundDynamicClasses = [];

function searchInDirectory(dir, fileExtension = '.tsx') {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    
    if (file.isDirectory() && !file.name.includes('node_modules') && !file.name.includes('.next')) {
      searchInDirectory(fullPath, fileExtension);
    } else if (file.isFile() && (file.name.endsWith('.tsx') || file.name.endsWith('.ts'))) {
      const content = fs.readFileSync(fullPath, 'utf8');
      
      problematicPatterns.forEach((pattern, index) => {
        const matches = content.match(pattern);
        if (matches) {
          foundDynamicClasses.push({
            file: fullPath.replace(process.cwd(), ''),
            pattern: index === 0 ? 'concatenación' : index === 1 ? 'template literal' : 'ternario',
            matches: matches.length
          });
        }
      });
    }
  }
}

searchInDirectory(srcDir);

if (foundDynamicClasses.length > 0) {
  console.log(`⚠️  ADVERTENCIA: Se encontraron ${foundDynamicClasses.length} archivos con clases dinámicas:`);
  foundDynamicClasses.slice(0, 10).forEach(item => {
    console.log(`   - ${item.file} (${item.pattern}, ${item.matches} matches)`);
  });
  if (foundDynamicClasses.length > 10) {
    console.log(`   ... y ${foundDynamicClasses.length - 10} más`);
  }
  console.log('\n   💡 Las clases dinámicas pueden no ser detectadas por Tailwind en producción');
  console.log('   💡 Solución: Agregar estas clases a safelist en tailwind.config.js\n');
} else {
  console.log('✅ No se encontraron clases dinámicas problemáticas\n');
}

// ============================================
// 5. VERIFICAR VARIABLES DE ENTORNO
// ============================================
console.log('📋 5. VERIFICANDO VARIABLES DE ENTORNO...\n');

const envLocalPath = path.join(process.cwd(), '.env.local');
const envProductionPath = path.join(process.cwd(), '.env.production');

if (fs.existsSync(envLocalPath)) {
  const envLocal = fs.readFileSync(envLocalPath, 'utf8');
  const nodeEnvLocal = envLocal.match(/NODE_ENV=(.+)/)?.[1] || 'no definido';
  const appEnvLocal = envLocal.match(/NEXT_PUBLIC_APP_ENV=(.+)/)?.[1] || 'no definido';
  
  console.log('✅ .env.local encontrado');
  console.log(`   - NODE_ENV: ${nodeEnvLocal}`);
  console.log(`   - NEXT_PUBLIC_APP_ENV: ${appEnvLocal}`);
  
  if (appEnvLocal === 'production') {
    console.log('⚠️  ADVERTENCIA: NEXT_PUBLIC_APP_ENV=production en local puede causar diferencias');
  }
  
  console.log('');
} else {
  console.log('⚠️  .env.local no encontrado\n');
}

// ============================================
// 6. VERIFICAR POSTCSS
// ============================================
console.log('📋 6. VERIFICANDO CONFIGURACIÓN DE POSTCSS...\n');

const postcssConfigPath = path.join(process.cwd(), 'postcss.config.mjs');
if (fs.existsSync(postcssConfigPath)) {
  const postcssContent = fs.readFileSync(postcssConfigPath, 'utf8');
  console.log('✅ postcss.config.mjs encontrado');
  
  if (postcssContent.includes('@tailwindcss/postcss')) {
    console.log('   - Tailwind PostCSS plugin configurado correctamente');
  } else {
    console.log('⚠️  ADVERTENCIA: @tailwindcss/postcss no encontrado');
  }
  
  console.log('');
} else {
  console.log('⚠️  postcss.config.mjs no encontrado\n');
}

// ============================================
// 7. VERIFICAR BUILD OUTPUT
// ============================================
console.log('📋 7. VERIFICANDO BUILD OUTPUT...\n');

const nextDir = path.join(process.cwd(), '.next');
if (fs.existsSync(nextDir)) {
  console.log('✅ Directorio .next encontrado (build local existe)');
  
  const staticDir = path.join(nextDir, 'static');
  if (fs.existsSync(staticDir)) {
    console.log('   - Directorio static existe');
    
    // Buscar archivos CSS
    const cssFiles = [];
    function findCssFiles(dir) {
      const files = fs.readdirSync(dir, { withFileTypes: true });
      for (const file of files) {
        const fullPath = path.join(dir, file.name);
        if (file.isDirectory()) {
          findCssFiles(fullPath);
        } else if (file.name.endsWith('.css')) {
          cssFiles.push(fullPath.replace(process.cwd(), ''));
        }
      }
    }
    findCssFiles(staticDir);
    
    if (cssFiles.length > 0) {
      console.log(`   - Archivos CSS generados: ${cssFiles.length}`);
      cssFiles.slice(0, 3).forEach(file => console.log(`     - ${file}`));
    }
  }
  
  console.log('');
} else {
  console.log('⚠️  Directorio .next no encontrado (ejecutar npm run build primero)\n');
}

// ============================================
// 8. RESUMEN Y RECOMENDACIONES
// ============================================
console.log('📋 8. RESUMEN Y RECOMENDACIONES\n');
console.log('='.repeat(60));
console.log('');

console.log('🔧 POSIBLES CAUSAS DE DIFERENCIAS VISUALES:');
console.log('');

const issues = [];

if (foundDynamicClasses.length > 0) {
  issues.push({
    severity: 'HIGH',
    issue: 'Clases dinámicas detectadas',
    solution: 'Agregar clases a safelist en tailwind.config.js'
  });
}

if (fs.existsSync(nextConfigPath)) {
  const nextConfig = require(nextConfigPath);
  if (nextConfig.experimental?.optimizeCss) {
    issues.push({
      severity: 'MEDIUM',
      issue: 'optimizeCss habilitado',
      solution: 'Puede estar eliminando estilos. Verificar que todas las clases estén en safelist'
    });
  }
}

if (issues.length === 0) {
  console.log('✅ No se encontraron problemas obvios en la configuración');
  console.log('');
  console.log('💡 OTRAS CAUSAS POSIBLES:');
  console.log('   1. Caché del navegador en producción');
  console.log('   2. Caché de Vercel/CDN');
  console.log('   3. Build diferente entre local y producción');
  console.log('   4. Variables CSS no aplicadas correctamente');
  console.log('   5. Dark mode activado por defecto');
  console.log('   6. Fuentes no cargadas en producción');
  console.log('   7. Imágenes/assets no encontrados');
} else {
  issues.forEach((issue, index) => {
    console.log(`${index + 1}. [${issue.severity}] ${issue.issue}`);
    console.log(`   Solución: ${issue.solution}`);
    console.log('');
  });
}

console.log('');
console.log('='.repeat(60));
console.log('');
console.log('📝 PRÓXIMOS PASOS:');
console.log('');
console.log('1. Verificar que todas las clases dinámicas estén en safelist');
console.log('2. Comparar build local vs producción:');
console.log('   - npm run build (local)');
console.log('   - Verificar tamaño de archivos CSS generados');
console.log('3. Limpiar caché de Vercel y navegador');
console.log('4. Verificar que NEXT_PUBLIC_APP_ENV sea "development" en local');
console.log('5. Revisar consola del navegador por errores de CSS');
console.log('6. Verificar Network tab para ver si CSS se carga correctamente');
console.log('');
console.log('✅ Diagnóstico completado');

