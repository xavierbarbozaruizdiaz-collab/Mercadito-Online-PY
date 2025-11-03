#!/usr/bin/env node

/**
 * ============================================
 * DIAGNÓSTICO PROFUNDO DE DIFERENCIAS
 * Analiza todos los aspectos que pueden causar diferencias
 * entre local y producción
 * ============================================
 */

const fs = require('fs');
const path = require('path');

console.log('🔬 DIAGNÓSTICO PROFUNDO DE DIFERENCIAS\n');
console.log('='.repeat(60));
console.log('');

const findings = [];

// 1. Verificar diferencias en configuración de Next.js
console.log('📋 1. CONFIGURACIÓN DE NEXT.JS\n');
const nextConfig = path.join(process.cwd(), 'next.config.js');
if (fs.existsSync(nextConfig)) {
  const configContent = fs.readFileSync(nextConfig, 'utf8');
  
  // Verificar output mode
  if (configContent.includes("output: 'standalone'")) {
    console.log('   ⚠️  output: standalone (puede afectar assets)');
    findings.push('output: standalone puede causar diferencias en paths de assets');
  }
  
  // Verificar optimizeCss
  if (configContent.match(/optimizeCss\s*:\s*true/)) {
    console.log('   ❌ optimizeCss habilitado (ELIMINA clases)');
    findings.push('optimizeCss está eliminando clases dinámicas');
  }
  
  // Verificar compress
  if (configContent.includes('compress: true')) {
    console.log('   ✅ compress habilitado');
  }
  
  // Verificar experimental features
  if (configContent.includes('experimental:')) {
    console.log('   ⚠️  Features experimentales habilitadas');
    findings.push('Features experimentales pueden causar diferencias');
  }
}

// 2. Verificar Tailwind en detalle
console.log('\n🎨 2. ANÁLISIS DE TAILWIND\n');
const tailwindConfig = path.join(process.cwd(), 'tailwind.config.js');
const globalsCss = path.join(process.cwd(), 'src', 'app', 'globals.css');
const safelistFile = path.join(process.cwd(), 'src', 'styles', 'tailwind-safelist.ts');

if (fs.existsSync(tailwindConfig)) {
  const configContent = fs.readFileSync(tailwindConfig, 'utf8');
  
  // Verificar content paths
  const contentMatch = configContent.match(/content:\s*\[([\s\S]*?)\]/);
  if (contentMatch) {
    const contentPaths = contentMatch[1];
    if (!contentPaths.includes('src/styles')) {
      console.log('   ❌ src/styles NO está en content paths');
      findings.push('src/styles no está en content paths de Tailwind');
    } else {
      console.log('   ✅ src/styles está en content paths');
    }
  }
  
  // Verificar safelist
  if (configContent.includes('safelist:')) {
    const safelistMatch = configContent.match(/safelist:\s*\[([\s\S]*?)\]/);
    if (safelistMatch) {
      const safelistCount = (safelistMatch[1].match(/'/g) || []).length / 2;
      console.log(`   ⚠️  safelist tiene ${safelistCount} clases (puede no funcionar en v4)`);
      findings.push('safelist en tailwind.config.js puede no funcionar en Tailwind v4');
    }
  }
}

// Verificar CSS generado
const cssDir = path.join(process.cwd(), '.next', 'static', 'css');
if (fs.existsSync(cssDir)) {
  const cssFiles = fs.readdirSync(cssDir).filter(f => f.endsWith('.css'));
  if (cssFiles.length > 0) {
    const cssFile = path.join(cssDir, cssFiles[0]);
    const cssContent = fs.readFileSync(cssFile, 'utf8');
    const cssSize = (fs.statSync(cssFile).size / 1024).toFixed(2);
    
    console.log(`   📊 CSS generado: ${cssSize} KB`);
    
    // Buscar clases críticas
    const criticalClasses = [
      'bg-blue-500',
      'bg-red-500',
      'bg-gray-100',
      'hover:bg-blue-600',
      'dark:bg-gray-700',
    ];
    
    console.log('\n   🔍 Clases críticas en CSS:');
    criticalClasses.forEach(cls => {
      // Buscar con formato escapado (Tailwind v4)
      const escaped = cls.replace(/:/g, '\\:');
      const pattern1 = new RegExp(`\\.${escaped}|\\b${escaped}\\b`);
      const pattern2 = new RegExp(cls.replace(/:/g, '\\\\:'));
      
      if (pattern1.test(cssContent) || pattern2.test(cssContent)) {
        console.log(`      ✅ ${cls}`);
      } else {
        console.log(`      ❌ ${cls} - NO ENCONTRADA`);
        findings.push(`Clase ${cls} no encontrada en CSS generado`);
      }
    });
    
    // Verificar si hay clases de safelist
    if (fs.existsSync(safelistFile)) {
      const safelistContent = fs.readFileSync(safelistFile, 'utf8');
      const safelistClasses = safelistContent.match(/\b(bg-|text-|border-|hover:|dark:)[\w-]+/g) || [];
      console.log(`\n   📝 Clases en safelist: ${safelistClasses.length}`);
      
      // Verificar cuántas están en el CSS
      let foundInCss = 0;
      safelistClasses.slice(0, 20).forEach(cls => {
        const escaped = cls.replace(/:/g, '\\:');
        if (new RegExp(`\\.${escaped}|\\b${escaped}\\b`).test(cssContent)) {
          foundInCss++;
        }
      });
      console.log(`   📊 Muestra (20 clases): ${foundInCss}/20 encontradas en CSS`);
      
      if (foundInCss < 15) {
        findings.push('Muchas clases del safelist no están en el CSS generado');
      }
    }
  }
}

// 3. Verificar variables de entorno que afectan el render
console.log('\n🔐 3. VARIABLES DE ENTORNO QUE AFECTAN RENDER\n');
const envLocal = path.join(process.cwd(), '.env.local');
const vercelConfig = path.join(process.cwd(), 'vercel.json');

const envVars = [
  'NEXT_PUBLIC_APP_ENV',
  'NODE_ENV',
  'NEXT_PUBLIC_FEATURE_HERO',
  'NEXT_PUBLIC_SUPABASE_URL',
];

if (fs.existsSync(envLocal)) {
  const envContent = fs.readFileSync(envLocal, 'utf8');
  console.log('   📝 Variables en .env.local:');
  envVars.forEach(varName => {
    const match = envContent.match(new RegExp(`${varName}=(.+)`));
    if (match) {
      console.log(`      ${varName}=${match[1]}`);
    } else {
      console.log(`      ${varName}=NO DEFINIDA`);
    }
  });
}

if (fs.existsSync(vercelConfig)) {
  try {
    const vercelContent = JSON.parse(fs.readFileSync(vercelConfig, 'utf8'));
    if (vercelContent.env) {
      console.log('\n   📝 Variables en vercel.json:');
      envVars.forEach(varName => {
        if (vercelContent.env[varName]) {
          console.log(`      ${varName}=${vercelContent.env[varName]}`);
        } else {
          console.log(`      ${varName}=NO DEFINIDA`);
        }
      });
      
      // Comparar
      if (fs.existsSync(envLocal)) {
        const envContent = fs.readFileSync(envLocal, 'utf8');
        envVars.forEach(varName => {
          const localMatch = envContent.match(new RegExp(`${varName}=(.+)`));
          const vercelValue = vercelContent.env[varName];
          
          if (localMatch && vercelValue) {
            if (localMatch[1].trim() !== vercelValue.trim()) {
              console.log(`      ⚠️  ${varName} DIFERENTE: local="${localMatch[1]}" vs vercel="${vercelValue}"`);
              findings.push(`${varName} tiene valores diferentes en local vs vercel.json`);
            }
          }
        });
      }
    }
  } catch (e) {
    console.log(`   ⚠️  Error leyendo vercel.json: ${e.message}`);
  }
}

// 4. Verificar componentes que usan clases dinámicas
console.log('\n⚛️  4. COMPONENTES CON CLASES DINÁMICAS\n');
const componentsDir = path.join(process.cwd(), 'src', 'components');
const appDir = path.join(process.cwd(), 'src', 'app');

function findDynamicClasses(dir) {
  const files = [];
  function walk(currentPath) {
    const items = fs.readdirSync(currentPath);
    items.forEach(item => {
      const fullPath = path.join(currentPath, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        walk(fullPath);
      } else if (item.endsWith('.tsx') || item.endsWith('.jsx')) {
        files.push(fullPath);
      }
    });
  }
  walk(dir);
  return files;
}

const componentFiles = [
  ...findDynamicClasses(componentsDir),
  ...findDynamicClasses(appDir),
].slice(0, 10); // Limitar a 10 archivos para performance

console.log(`   📁 Analizando ${componentFiles.length} archivos...`);

let dynamicClassCount = 0;
const dynamicPatterns = [
  /className\s*=\s*\{[^}]*\?/,
  /className\s*=\s*`[^`]*\$\{/,
  /className\s*=\s*\{\s*\[/,
  /clsx\(/,
  /cn\(/,
];

componentFiles.forEach(file => {
  try {
    const content = fs.readFileSync(file, 'utf8');
    dynamicPatterns.forEach(pattern => {
      if (pattern.test(content)) {
        dynamicClassCount++;
        console.log(`      ⚠️  ${path.relative(process.cwd(), file)} usa clases dinámicas`);
      }
    });
  } catch (e) {
    // Ignorar errores de lectura
  }
});

if (dynamicClassCount > 0) {
  findings.push(`${dynamicClassCount} archivos usan clases dinámicas que pueden no estar en CSS`);
}

// 5. Verificar modo de renderizado
console.log('\n🖼️  5. MODO DE RENDERIZADO\n');
const layoutFile = path.join(process.cwd(), 'src', 'app', 'layout.tsx');
if (fs.existsSync(layoutFile)) {
  const layoutContent = fs.readFileSync(layoutFile, 'utf8');
  
  if (layoutContent.includes("'use client'")) {
    console.log('   ⚠️  Layout es Client Component (puede afectar SSR)');
    findings.push('Layout es Client Component, puede causar diferencias en SSR');
  } else {
    console.log('   ✅ Layout es Server Component');
  }
  
  // Verificar dynamic imports
  if (layoutContent.includes('dynamic(') || layoutContent.includes('next/dynamic')) {
    console.log('   ⚠️  Usa dynamic imports (puede afectar render inicial)');
    findings.push('Dynamic imports pueden causar diferencias en render inicial');
  }
}

// Resumen
console.log('\n' + '='.repeat(60));
console.log('\n📊 RESUMEN DE HALLAZGOS\n');

if (findings.length === 0) {
  console.log('   ✅ No se encontraron problemas obvios');
  console.log('\n   💡 POSIBLES CAUSAS RESTANTES:');
  console.log('      1. Diferencias en datos de la base de datos');
  console.log('      2. Diferencias en timing de carga');
  console.log('      3. Diferencias en caché del navegador');
  console.log('      4. Diferencias en orden de carga de recursos');
  console.log('      5. Diferencias en versiones de dependencias');
} else {
  console.log(`   ⚠️  ${findings.length} problema(s) encontrado(s):\n`);
  findings.forEach((finding, i) => {
    console.log(`      ${i + 1}. ${finding}`);
  });
}

console.log('\n' + '='.repeat(60));
console.log('\n💡 PRÓXIMOS PASOS:');
console.log('   1. Comparar HTML generado local vs producción');
console.log('   2. Comparar CSS cargado en navegador');
console.log('   3. Verificar Network tab para diferencias en carga');
console.log('   4. Comparar datos de la base de datos');
console.log('   5. Verificar console por errores');

