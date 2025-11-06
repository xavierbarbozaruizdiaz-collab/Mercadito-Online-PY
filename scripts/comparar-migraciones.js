#!/usr/bin/env node

/**
 * ============================================
 * COMPARADOR DE MIGRACIONES
 * Compara migraciones locales vs producción
 * ============================================
 */

const fs = require('fs');
const path = require('path');

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

/**
 * Lee todas las migraciones del directorio
 */
function getLocalMigrations() {
  const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
  
  if (!fs.existsSync(migrationsDir)) {
    return [];
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .map(file => {
      // Extraer timestamp/nombre de la migración
      const match = file.match(/^(\d{14}|\d{8}_[^_]+|.+?)(?:_(.+))?\.sql$/);
      if (match) {
        return {
          filename: file,
          version: match[1],
          name: match[2] || match[1],
        };
      }
      return {
        filename: file,
        version: file.replace('.sql', ''),
        name: file.replace('.sql', ''),
      };
    })
    .sort((a, b) => {
      // Ordenar por timestamp si existe, sino por nombre
      if (a.version < b.version) return -1;
      if (a.version > b.version) return 1;
      return 0;
    });

  return files;
}

/**
 * Genera reporte de migraciones locales
 */
function generateReport(localMigrations) {
  console.log('\n' + colors.bold + colors.cyan + '='.repeat(80));
  console.log('  MIGRACIONES LOCALES EN EL REPOSITORIO');
  console.log('='.repeat(80) + colors.reset + '\n');

  console.log(colors.bold + `Total de migraciones locales: ${localMigrations.length}` + colors.reset + '\n');

  // Agrupar por fecha
  const grouped = {};
  for (const mig of localMigrations) {
    const datePrefix = mig.version.substring(0, 8); // YYYYMMDD
    if (!grouped[datePrefix]) {
      grouped[datePrefix] = [];
    }
    grouped[datePrefix].push(mig);
  }

  // Mostrar por fecha
  const sortedDates = Object.keys(grouped).sort();
  for (const date of sortedDates) {
    const migs = grouped[date];
    const dateFormatted = `${date.substring(0, 4)}-${date.substring(4, 6)}-${date.substring(6, 8)}`;
    console.log(colors.cyan + `\n📅 ${dateFormatted} (${migs.length} migraciones)` + colors.reset);
    console.log('─'.repeat(80));
    
    for (const mig of migs) {
      console.log(`  ${colors.green}✓${colors.reset} ${mig.filename}`);
    }
  }

  // Últimas 10 migraciones
  console.log(colors.bold + colors.yellow + '\n' + '='.repeat(80));
  console.log('  ÚLTIMAS 10 MIGRACIONES (Más recientes)');
  console.log('='.repeat(80) + colors.reset + '\n');

  const last10 = localMigrations.slice(-10).reverse();
  for (const mig of last10) {
    console.log(`  ${colors.cyan}→${colors.reset} ${mig.filename}`);
  }

  // Instrucciones
  console.log(colors.bold + colors.blue + '\n' + '='.repeat(80));
  console.log('  📋 PRÓXIMOS PASOS PARA VERIFICAR EN PRODUCCIÓN');
  console.log('='.repeat(80) + colors.reset);
  
  console.log(`
1. Ve al Supabase Dashboard → SQL Editor

2. Ejecuta este SQL para ver migraciones aplicadas en producción:

${colors.cyan}-- Ver todas las migraciones aplicadas
SELECT version, name
FROM supabase_migrations.schema_migrations
ORDER BY version ASC;${colors.reset}

3. Compara la lista de producción con esta lista local:
   - Total local: ${localMigrations.length} migraciones
   - Si producción tiene menos, faltan migraciones por aplicar
   - Si producción tiene más, hay migraciones aplicadas manualmente

4. Para aplicar migraciones faltantes:
   ${colors.yellow}supabase db push${colors.reset}

5. Si hay diferencias, revisa:
   - Migraciones con timestamps similares
   - Migraciones con nombres diferentes
   - Orden de aplicación
  `);

  // Generar lista para copiar
  console.log(colors.bold + colors.cyan + '\n' + '='.repeat(80));
  console.log('  📝 LISTA DE MIGRACIONES PARA COMPARAR');
  console.log('='.repeat(80) + colors.reset + '\n');
  
  console.log('Copia esta lista y compárala con las de producción:\n');
  for (let i = 0; i < localMigrations.length; i++) {
    const mig = localMigrations[i];
    console.log(`${String(i + 1).padStart(3, ' ')}. ${mig.filename}`);
  }
  
  console.log('\n');
}

/**
 * Función principal
 */
function main() {
  try {
    const localMigrations = getLocalMigrations();
    
    if (localMigrations.length === 0) {
      console.log(colors.yellow + '\n⚠️  No se encontraron migraciones locales.\n' + colors.reset);
      console.log('Verifica que exista la carpeta: supabase/migrations/\n');
      return;
    }
    
    generateReport(localMigrations);
    
  } catch (error) {
    console.error(colors.red + '\n❌ Error:', error.message + colors.reset);
    console.error(error.stack);
    process.exit(1);
  }
}

// Ejecutar
main();

