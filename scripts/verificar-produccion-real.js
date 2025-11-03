#!/usr/bin/env node

/**
 * ============================================
 * VERIFICACIÓN REAL DE PRODUCCIÓN
 * Verifica qué está pasando realmente
 * ============================================
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 VERIFICACIÓN REAL DE PRODUCCIÓN\n');
console.log('='.repeat(60));
console.log('');

const issues = [];

// 1. Verificar que NEXT_PUBLIC_FEATURE_HERO está en vercel.json
console.log('📋 1. VERIFICANDO CONFIGURACIÓN\n');
const vercelJson = path.join(process.cwd(), 'vercel.json');
if (fs.existsSync(vercelJson)) {
  const vercel = JSON.parse(fs.readFileSync(vercelJson, 'utf8'));
  if (vercel.env && vercel.env.NEXT_PUBLIC_FEATURE_HERO) {
    console.log(`   ✅ NEXT_PUBLIC_FEATURE_HERO=${vercel.env.NEXT_PUBLIC_FEATURE_HERO} en vercel.json`);
  } else {
    console.log('   ❌ NEXT_PUBLIC_FEATURE_HERO NO está en vercel.json');
    issues.push('NEXT_PUBLIC_FEATURE_HERO no está en vercel.json');
  }
} else {
  console.log('   ⚠️  vercel.json no existe');
  issues.push('vercel.json no existe');
}

// 2. Verificar código del hero
console.log('\n📋 2. VERIFICANDO CÓDIGO DEL HERO\n');
const pageTsx = path.join(process.cwd(), 'src', 'app', 'page.tsx');
if (fs.existsSync(pageTsx)) {
  const content = fs.readFileSync(pageTsx, 'utf8');
  
  // Verificar FEATURE_HERO
  if (content.includes('FEATURE_HERO')) {
    console.log('   ✅ FEATURE_HERO está en el código');
    const featureHeroMatch = content.match(/FEATURE_HERO\s*=\s*process\.env\.NEXT_PUBLIC_FEATURE_HERO\s*===\s*['"]true['"]/);
    if (featureHeroMatch) {
      console.log('   ✅ FEATURE_HERO se verifica correctamente');
    } else {
      console.log('   ⚠️  FEATURE_HERO puede no estar verificándose correctamente');
      issues.push('FEATURE_HERO puede no estar verificándose correctamente');
    }
  } else {
    console.log('   ❌ FEATURE_HERO no está en el código');
    issues.push('FEATURE_HERO no está en el código');
  }
  
  // Verificar renderizado condicional
  if (content.includes('FEATURE_HERO') && content.includes('if (FEATURE_HERO)')) {
    console.log('   ✅ Hero se renderiza condicionalmente');
  } else {
    console.log('   ⚠️  Hero puede no estar renderizándose condicionalmente');
  }
  
  // Verificar HeroSliderClient
  if (content.includes('HeroSliderClient')) {
    console.log('   ✅ HeroSliderClient está importado');
  } else {
    console.log('   ❌ HeroSliderClient NO está importado');
    issues.push('HeroSliderClient no está importado');
  }
} else {
  console.log('   ❌ page.tsx no existe');
  issues.push('page.tsx no existe');
}

// 3. Verificar layout del dashboard
console.log('\n📋 3. VERIFICANDO LAYOUT DEL DASHBOARD\n');
const dashboardLayout = path.join(process.cwd(), 'src', 'app', '(dashboard)', 'layout.tsx');
if (fs.existsSync(dashboardLayout)) {
  const content = fs.readFileSync(dashboardLayout, 'utf8');
  
  // Verificar autenticación
  if (content.includes('getSession')) {
    console.log('   ✅ Layout verifica autenticación');
  } else {
    console.log('   ❌ Layout NO verifica autenticación');
    issues.push('Dashboard layout no verifica autenticación');
  }
  
  // Verificar redirección
  if (content.includes('window.location.href')) {
    console.log('   ✅ Layout tiene redirección');
  } else {
    console.log('   ⚠️  Layout puede no tener redirección');
  }
  
  // Verificar permisos
  if (content.includes('hasAccess')) {
    console.log('   ✅ Layout verifica permisos');
  } else {
    console.log('   ❌ Layout NO verifica permisos');
    issues.push('Dashboard layout no verifica permisos');
  }
} else {
  console.log('   ❌ Dashboard layout no existe');
  issues.push('Dashboard layout no existe');
}

// 4. Verificar rutas del dashboard
console.log('\n📋 4. VERIFICANDO RUTAS DEL DASHBOARD\n');
const dashboardRoutes = [
  'src/app/(dashboard)/admin/page.tsx',
  'src/app/(dashboard)/seller/page.tsx',
  'src/app/dashboard/affiliate/page.tsx',
];

dashboardRoutes.forEach(route => {
  const routePath = path.join(process.cwd(), route);
  if (fs.existsSync(routePath)) {
    console.log(`   ✅ ${route} existe`);
  } else {
    console.log(`   ❌ ${route} NO existe`);
    issues.push(`${route} no existe`);
  }
});

// 5. Verificar variables de entorno críticas
console.log('\n📋 5. VERIFICANDO VARIABLES DE ENTORNO\n');
const envLocal = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envLocal)) {
  const envContent = fs.readFileSync(envLocal, 'utf8');
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ];
  
  requiredVars.forEach(varName => {
    if (envContent.includes(varName)) {
      console.log(`   ✅ ${varName} está en .env.local`);
    } else {
      console.log(`   ❌ ${varName} NO está en .env.local`);
      issues.push(`${varName} no está en .env.local`);
    }
  });
} else {
  console.log('   ⚠️  .env.local no existe');
}

// Resumen
console.log('\n' + '='.repeat(60));
console.log('\n📊 RESUMEN\n');

if (issues.length === 0) {
  console.log('   ✅ Todas las verificaciones pasaron');
  console.log('\n💡 POSIBLES CAUSAS SI NO FUNCIONA EN PRODUCCIÓN:');
  console.log('   1. Variables de entorno NO están configuradas en Vercel Dashboard');
  console.log('   2. vercel.json puede no estar siendo usado por Vercel');
  console.log('   3. Datos de la base de datos no existen en producción');
  console.log('   4. RLS (Row Level Security) bloquea acceso');
  console.log('   5. Errores en consola que no se están mostrando');
  console.log('   6. Cache de Vercel');
} else {
  console.log(`   ⚠️  ${issues.length} problema(s) encontrado(s):`);
  issues.forEach(issue => console.log(`      - ${issue}`));
}

console.log('\n🚨 ACCIÓN CRÍTICA:');
console.log('   Verifica en Vercel Dashboard → Settings → Environment Variables');
console.log('   que NEXT_PUBLIC_FEATURE_HERO esté definido como "true"');
console.log('\n   vercel.json puede no ser suficiente, Vercel puede requerir');
console.log('   que las variables se configuren en el Dashboard.');

