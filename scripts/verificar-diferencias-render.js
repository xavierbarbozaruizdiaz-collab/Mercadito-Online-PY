#!/usr/bin/env node

/**
 * ============================================
 * VERIFICADOR DE DIFERENCIAS EN RENDER
 * Identifica qué puede causar diferencias en el render
 * ============================================
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 VERIFICANDO DIFERENCIAS EN RENDER\n');
console.log('='.repeat(60));
console.log('');

const issues = [];

// 1. Verificar variables de entorno que afectan render
console.log('🔐 1. VARIABLES DE ENTORNO QUE AFECTAN RENDER\n');
const envLocal = path.join(process.cwd(), '.env.local');
const vercelConfig = path.join(process.cwd(), 'vercel.json');

const renderAffectingVars = [
  'NEXT_PUBLIC_APP_ENV',
  'NODE_ENV',
  'NEXT_PUBLIC_FEATURE_HERO',
];

if (fs.existsSync(envLocal)) {
  const envContent = fs.readFileSync(envLocal, 'utf8');
  console.log('   📝 Local (.env.local):');
  renderAffectingVars.forEach(varName => {
    const match = envContent.match(new RegExp(`${varName}=(.+)`));
    if (match) {
      console.log(`      ${varName}=${match[1]}`);
    }
  });
}

if (fs.existsSync(vercelConfig)) {
  try {
    const vercelContent = JSON.parse(fs.readFileSync(vercelConfig, 'utf8'));
    console.log('\n   📝 Producción (vercel.json):');
    renderAffectingVars.forEach(varName => {
      if (vercelContent.env && vercelContent.env[varName]) {
        console.log(`      ${varName}=${vercelContent.env[varName]}`);
      } else {
        console.log(`      ${varName}=NO DEFINIDA`);
      }
    });
    
    // Comparar
    if (fs.existsSync(envLocal)) {
      const envContent = fs.readFileSync(envLocal, 'utf8');
      renderAffectingVars.forEach(varName => {
        const localMatch = envContent.match(new RegExp(`${varName}=(.+)`));
        const vercelValue = vercelContent.env?.[varName];
        
        if (localMatch && vercelValue) {
          if (localMatch[1].trim() !== vercelValue.trim()) {
            console.log(`      ⚠️  ${varName} DIFERENTE`);
            issues.push(`${varName} tiene valores diferentes`);
          }
        } else if (localMatch && !vercelValue) {
          console.log(`      ⚠️  ${varName} solo en local`);
          issues.push(`${varName} solo definida en local`);
        } else if (!localMatch && vercelValue) {
          console.log(`      ⚠️  ${varName} solo en producción`);
          issues.push(`${varName} solo definida en producción`);
        }
      });
    }
  } catch (e) {
    console.log(`   ⚠️  Error leyendo vercel.json`);
  }
}

// 2. Verificar feature flags en código
console.log('\n🚩 2. FEATURE FLAGS EN CÓDIGO\n');
const appDir = path.join(process.cwd(), 'src', 'app');
const componentsDir = path.join(process.cwd(), 'src', 'components');

function findFeatureFlags(dir) {
  const files = [];
  function walk(currentPath) {
    if (!fs.existsSync(currentPath)) return;
    const items = fs.readdirSync(currentPath);
    items.forEach(item => {
      const fullPath = path.join(currentPath, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        walk(fullPath);
      } else if (item.endsWith('.tsx') || item.endsWith('.jsx') || item.endsWith('.ts')) {
        files.push(fullPath);
      }
    });
  }
  walk(dir);
  return files;
}

const allFiles = [
  ...findFeatureFlags(appDir),
  ...findFeatureFlags(componentsDir),
].slice(0, 50);

let featureFlagCount = 0;
allFiles.forEach(file => {
  try {
    const content = fs.readFileSync(file, 'utf8');
    
    // Buscar feature flags
    const patterns = [
      /FEATURE_\w+/g,
      /NEXT_PUBLIC_\w+/g,
      /process\.env\.NODE_ENV/g,
      /process\.env\.NEXT_PUBLIC/g,
    ];
    
    patterns.forEach(pattern => {
      if (pattern.test(content)) {
        featureFlagCount++;
        const matches = content.match(pattern);
        if (matches && matches.length > 0) {
          console.log(`   ⚠️  ${path.relative(process.cwd(), file)}`);
          const uniqueMatches = [...new Set(matches)];
          uniqueMatches.forEach(match => {
            console.log(`      - ${match}`);
          });
        }
      }
    });
  } catch (e) {
    // Ignorar
  }
});

if (featureFlagCount === 0) {
  console.log('   ✅ No se encontraron feature flags obvios');
}

// 3. Verificar revalidate y dynamic
console.log('\n⚡ 3. CONFIGURACIÓN DE CACHÉ Y RENDER\n');
const pageFiles = findFeatureFlags(appDir).filter(f => 
  f.includes('page.tsx') || f.includes('layout.tsx')
);

pageFiles.slice(0, 10).forEach(file => {
  try {
    const content = fs.readFileSync(file, 'utf8');
    
    if (content.includes('revalidate')) {
      const revalidateMatch = content.match(/revalidate\s*=\s*(\d+)/);
      if (revalidateMatch) {
        console.log(`   📄 ${path.relative(process.cwd(), file)}: revalidate=${revalidateMatch[1]}`);
      }
    }
    
    if (content.includes("export const dynamic")) {
      const dynamicMatch = content.match(/dynamic\s*=\s*['"]([^'"]+)['"]/);
      if (dynamicMatch) {
        console.log(`   📄 ${path.relative(process.cwd(), file)}: dynamic=${dynamicMatch[1]}`);
      }
    }
  } catch (e) {
    // Ignorar
  }
});

// 4. Verificar SSR vs CSR
console.log('\n🖼️  4. SERVER VS CLIENT COMPONENTS\n');
let serverComponents = 0;
let clientComponents = 0;

allFiles.slice(0, 30).forEach(file => {
  try {
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes("'use client'")) {
      clientComponents++;
    } else {
      serverComponents++;
    }
  } catch (e) {
    // Ignorar
  }
});

console.log(`   📊 Server Components: ${serverComponents}`);
console.log(`   📊 Client Components: ${clientComponents}`);

// Resumen
console.log('\n' + '='.repeat(60));
console.log('\n📊 RESUMEN\n');

if (issues.length === 0 && featureFlagCount === 0) {
  console.log('   ✅ No se encontraron diferencias obvias en render');
} else {
  if (issues.length > 0) {
    console.log(`   ⚠️  ${issues.length} diferencia(s) encontrada(s):`);
    issues.forEach(issue => console.log(`      - ${issue}`));
  }
  if (featureFlagCount > 0) {
    console.log(`   ⚠️  ${featureFlagCount} archivo(s) con feature flags`);
  }
}

console.log('\n💡 POSIBLES CAUSAS DE DIFERENCIAS:');
console.log('   1. Variables de entorno diferentes');
console.log('   2. Feature flags activados/desactivados');
console.log('   3. Caché diferente (revalidate, dynamic)');
console.log('   4. Clases CSS no incluidas');
console.log('   5. Datos diferentes de la base de datos');

