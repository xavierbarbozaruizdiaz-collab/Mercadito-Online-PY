#!/usr/bin/env node

/**
 * ============================================
 * VERIFICADOR DE VARIABLES DE ENTORNO
 * Compara variables locales vs producción (Vercel)
 * ============================================
 */

const fs = require('fs');
const path = require('path');

// Colores para la consola (Windows compatible)
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

// Variables críticas (sin ellas la app no funciona)
const CRITICAL_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
];

// Variables importantes (funcionalidad reducida sin ellas)
const IMPORTANT_VARS = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_APP_URL',
  'CRON_SECRET',
];

// Variables opcionales pero que pueden causar diferencias
const OPTIONAL_VARS = [
  'NEXT_PUBLIC_FEATURE_HERO',
  'NEXT_PUBLIC_APP_ENV',
  'RESEND_API_KEY',
  'RESEND_FROM_EMAIL',
  'NEXT_PUBLIC_VAPID_PUBLIC_KEY',
];

// Variables de pagos (opcionales)
const PAYMENT_VARS = [
  'STRIPE_SECRET_KEY',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'PAYPAL_CLIENT_ID',
  'PAYPAL_SECRET',
  'NEXT_PUBLIC_PAYPAL_CLIENT_ID',
  'NEXT_PUBLIC_PAYPAL_MODE',
  'PAGOPAR_PUBLIC_TOKEN',
  'PAGOPAR_PUBLIC_KEY',
  'PAGOPAR_PRIVATE_TOKEN',
  'PAGOPAR_PRIVATE_KEY',
  'PAGOPAR_ENVIRONMENT',
  'PAGOPAR_WEBHOOK_SECRET',
];

// Variables de WhatsApp (opcionales)
const WHATSAPP_VARS = [
  'WHATSAPP_API_ENABLED',
  'WHATSAPP_API_KEY',
  'WHATSAPP_API_URL',
];

// Todas las variables que deberían existir
const ALL_VARS = [
  ...CRITICAL_VARS,
  ...IMPORTANT_VARS,
  ...OPTIONAL_VARS,
  ...PAYMENT_VARS,
  ...WHATSAPP_VARS,
];

// Variables que DEBEN ser diferentes entre local y prod
const EXPECTED_DIFFERENCES = {
  'NEXT_PUBLIC_APP_URL': {
    local: 'http://localhost:3000',
    prod: 'https://mercadito-online-py.vercel.app',
    note: 'Esta diferencia es esperada y correcta',
  },
  'NEXT_PUBLIC_APP_ENV': {
    local: 'development',
    prod: 'production',
    note: 'Esta diferencia es esperada y correcta',
  },
};

/**
 * Lee variables de entorno de un archivo
 */
function readEnvFile(filePath) {
  const env = {};
  
  if (!fs.existsSync(filePath)) {
    return env;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    
    // Ignorar comentarios y líneas vacías
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    // Parsear KEY=VALUE
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      env[key] = value;
    }
  }

  return env;
}

/**
 * Obtiene todas las variables de entorno relevantes
 */
function getAllEnvVars() {
  const rootDir = path.resolve(__dirname, '..');
  
  // Intentar leer .env.local primero, luego .env
  const localEnv = readEnvFile(path.join(rootDir, '.env.local')) || 
                   readEnvFile(path.join(rootDir, '.env')) ||
                   {};
  
  // También leer de process.env (variables actuales)
  const processEnv = {};
  for (const key of ALL_VARS) {
    if (process.env[key]) {
      processEnv[key] = process.env[key];
    }
  }

  // Combinar: .env.local tiene prioridad sobre process.env
  const combined = { ...processEnv, ...localEnv };

  return combined;
}

/**
 * Muestra un valor ocultando información sensible
 */
function maskValue(value, showFirst = 8, showLast = 4) {
  if (!value || value.length <= showFirst + showLast) {
    return '***';
  }
  return `${value.substring(0, showFirst)}...${value.substring(value.length - showLast)}`;
}

/**
 * Compara dos valores de variables
 */
function compareValues(key, localValue, prodValue) {
  if (!localValue && !prodValue) {
    return 'missing_both';
  }
  if (!localValue) {
    return 'missing_local';
  }
  if (!prodValue) {
    return 'missing_prod';
  }
  
  // Verificar si la diferencia es esperada
  const expectedDiff = EXPECTED_DIFFERENCES[key];
  if (expectedDiff) {
    const localMatch = expectedDiff.local === localValue || localValue.includes('localhost');
    const prodMatch = expectedDiff.prod === prodValue || prodValue.includes('vercel.app');
    if (localMatch && prodMatch) {
      return 'expected_difference';
    }
  }
  
  if (localValue === prodValue) {
    return 'same';
  }
  
  return 'different';
}

/**
 * Genera el reporte completo
 */
function generateReport(localEnv) {
  console.log('\n' + colors.bold + colors.cyan + '='.repeat(80));
  console.log('  VERIFICACIÓN DE VARIABLES DE ENTORNO');
  console.log('  Localhost vs Producción (Vercel)');
  console.log('='.repeat(80) + colors.reset + '\n');

  // Estadísticas
  const stats = {
    critical: { ok: 0, missing: 0, different: 0 },
    important: { ok: 0, missing: 0, different: 0 },
    optional: { ok: 0, missing: 0, different: 0 },
    payments: { ok: 0, missing: 0, different: 0 },
    whatsapp: { ok: 0, missing: 0, different: 0 },
  };

  // Variables críticas
  console.log(colors.bold + colors.red + '🔴 VARIABLES CRÍTICAS (Sin ellas la app no funciona)' + colors.reset);
  console.log('─'.repeat(80));
  for (const key of CRITICAL_VARS) {
    const localValue = localEnv[key];
    const status = localValue ? '✅ Presente' : '❌ FALTANTE';
    const color = localValue ? colors.green : colors.red;
    
    console.log(`${color}${status}${colors.reset} ${colors.bold}${key}${colors.reset}`);
    if (localValue) {
      console.log(`   Valor local: ${maskValue(localValue)}`);
      console.log(`   ${colors.yellow}⚠️  Verifica en Vercel que tenga el MISMO valor${colors.reset}`);
    } else {
      console.log(`   ${colors.red}❌ NO ESTÁ CONFIGURADA LOCALMENTE${colors.reset}`);
    }
    console.log();
    
    if (localValue) stats.critical.ok++;
    else stats.critical.missing++;
  }

  // Variables importantes
  console.log(colors.bold + colors.yellow + '\n🟡 VARIABLES IMPORTANTES (Funcionalidad reducida sin ellas)' + colors.reset);
  console.log('─'.repeat(80));
  for (const key of IMPORTANT_VARS) {
    const localValue = localEnv[key];
    const status = localValue ? '✅ Presente' : '⚠️  Opcional';
    const color = localValue ? colors.green : colors.yellow;
    
    console.log(`${color}${status}${colors.reset} ${colors.bold}${key}${colors.reset}`);
    if (localValue) {
      console.log(`   Valor local: ${maskValue(localValue)}`);
      console.log(`   ${colors.yellow}⚠️  Verifica en Vercel${colors.reset}`);
    } else {
      console.log(`   ${colors.yellow}⚠️  No configurada (algunas funcionalidades pueden no trabajar)${colors.reset}`);
    }
    console.log();
    
    if (localValue) stats.important.ok++;
    else stats.important.missing++;
  }

  // Variables opcionales
  console.log(colors.bold + colors.blue + '\n🔵 VARIABLES OPCIONALES (Pueden causar diferencias visuales/funcionales)' + colors.reset);
  console.log('─'.repeat(80));
  for (const key of OPTIONAL_VARS) {
    const localValue = localEnv[key];
    const status = localValue ? '✅ Presente' : '⚪ No configurada';
    const color = localValue ? colors.green : colors.blue;
    
    console.log(`${color}${status}${colors.reset} ${colors.bold}${key}${colors.reset}`);
    if (localValue) {
      console.log(`   Valor local: ${localValue}`);
      
      // Verificar si es una variable con diferencia esperada
      const expectedDiff = EXPECTED_DIFFERENCES[key];
      if (expectedDiff) {
        console.log(`   ${colors.cyan}ℹ️  Esta variable DEBE ser diferente en producción:${colors.reset}`);
        console.log(`      Local esperado: ${expectedDiff.local}`);
        console.log(`      Prod esperado:  ${expectedDiff.prod}`);
      } else {
        console.log(`   ${colors.yellow}⚠️  Verifica en Vercel que tenga el mismo valor${colors.reset}`);
      }
    }
    console.log();
    
    if (localValue) stats.optional.ok++;
    else stats.optional.missing++;
  }

  // Variables de pagos
  if (PAYMENT_VARS.some(key => localEnv[key])) {
    console.log(colors.bold + colors.cyan + '\n💳 VARIABLES DE PAGOS (Opcional - según gateway usado)' + colors.reset);
    console.log('─'.repeat(80));
    for (const key of PAYMENT_VARS) {
      const localValue = localEnv[key];
      if (localValue) {
        console.log(`${colors.green}✅${colors.reset} ${colors.bold}${key}${colors.reset}`);
        console.log(`   Valor local: ${maskValue(localValue)}`);
        console.log(`   ${colors.yellow}⚠️  Verifica en Vercel${colors.reset}`);
        console.log();
        stats.payments.ok++;
      }
    }
  }

  // Variables de WhatsApp
  if (WHATSAPP_VARS.some(key => localEnv[key])) {
    console.log(colors.bold + colors.cyan + '\n📱 VARIABLES DE WHATSAPP (Opcional)' + colors.reset);
    console.log('─'.repeat(80));
    for (const key of WHATSAPP_VARS) {
      const localValue = localEnv[key];
      if (localValue) {
        console.log(`${colors.green}✅${colors.reset} ${colors.bold}${key}${colors.reset}`);
        console.log(`   Valor local: ${localValue}`);
        console.log(`   ${colors.yellow}⚠️  Verifica en Vercel${colors.reset}`);
        console.log();
        stats.whatsapp.ok++;
      }
    }
  }

  // Resumen
  console.log(colors.bold + colors.cyan + '\n' + '='.repeat(80));
  console.log('  RESUMEN');
  console.log('='.repeat(80) + colors.reset);
  
  console.log(`\n${colors.bold}Críticas:${colors.reset}`);
  console.log(`  ${colors.green}✅ Configuradas: ${stats.critical.ok}${colors.reset}`);
  console.log(`  ${colors.red}❌ Faltantes: ${stats.critical.missing}${colors.reset}`);
  
  console.log(`\n${colors.bold}Importantes:${colors.reset}`);
  console.log(`  ${colors.green}✅ Configuradas: ${stats.important.ok}${colors.reset}`);
  console.log(`  ${colors.yellow}⚠️  No configuradas: ${stats.important.missing}${colors.reset}`);
  
  console.log(`\n${colors.bold}Opcionales:${colors.reset}`);
  console.log(`  ${colors.green}✅ Configuradas: ${stats.optional.ok}${colors.reset}`);
  console.log(`  ${colors.blue}⚪ No configuradas: ${stats.optional.missing}${colors.reset}`);

  // Instrucciones para Vercel
  console.log(colors.bold + colors.yellow + '\n' + '='.repeat(80));
  console.log('  📋 PRÓXIMOS PASOS');
  console.log('='.repeat(80) + colors.reset);
  console.log(`
1. Ve a Vercel Dashboard → Tu Proyecto → Settings → Environment Variables

2. Para cada variable ${colors.green}✅ Presente${colors.reset} arriba:
   - Verifica que exista en Vercel
   - Verifica que tenga el ${colors.bold}MISMO valor${colors.reset} (excepto las marcadas como diferencia esperada)

3. Variables críticas que DEBEN coincidir exactamente:
   ${colors.red}${CRITICAL_VARS.join(', ')}${colors.reset}

4. Variables con diferencia esperada (OK si son diferentes):
   ${colors.cyan}NEXT_PUBLIC_APP_URL (localhost vs vercel.app)${colors.reset}
   ${colors.cyan}NEXT_PUBLIC_APP_ENV (development vs production)${colors.reset}

5. Si alguna variable ${colors.red}❌ FALTANTE${colors.reset} está en Vercel pero no local:
   - Agrégalas a tu .env.local

6. Si alguna variable está en local pero falta en Vercel:
   - Agrégala a Vercel (Settings → Environment Variables)
  `);

  // Checklist para copiar
  console.log(colors.bold + colors.cyan + '\n' + '='.repeat(80));
  console.log('  📝 CHECKLIST PARA VERIFICAR EN VERCEL');
  console.log('='.repeat(80) + colors.reset + '\n');
  
  console.log('Copia y pega esto en un documento y marca cuando verifiques cada una:\n');
  
  for (const key of [...CRITICAL_VARS, ...IMPORTANT_VARS, ...OPTIONAL_VARS]) {
    if (localEnv[key]) {
      const expectedDiff = EXPECTED_DIFFERENCES[key];
      const note = expectedDiff 
        ? ` [DIFERENCIA ESPERADA: ${expectedDiff.note}]`
        : ' [DEBE COINCIDIR]';
      console.log(`[ ] ${key}${note}`);
    }
  }
  
  console.log('\n');

  // Advertencias finales
  if (stats.critical.missing > 0) {
    console.log(colors.red + colors.bold + '\n⚠️  ADVERTENCIA: Hay variables críticas faltantes!' + colors.reset);
    console.log('   La aplicación NO funcionará sin estas variables.\n');
  }
}

/**
 * Función principal
 */
function main() {
  try {
    const localEnv = getAllEnvVars();
    
    if (Object.keys(localEnv).length === 0) {
      console.log(colors.yellow + '\n⚠️  No se encontraron variables de entorno.' + colors.reset);
      console.log('   Buscando en: .env.local o .env');
      console.log('   También revisando process.env\n');
      console.log('   Si tienes variables en otro archivo, asegúrate de que esté en la raíz del proyecto.\n');
    }
    
    generateReport(localEnv);
    
  } catch (error) {
    console.error(colors.red + '\n❌ Error:', error.message + colors.reset);
    console.error(error.stack);
    process.exit(1);
  }
}

// Ejecutar
main();

