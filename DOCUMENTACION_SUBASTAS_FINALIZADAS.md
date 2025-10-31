# Documentación: Gestión de Subastas Finalizadas y Productos Vendidos/Archivados

## 📋 Estado Actual

### Subastas Finalizadas
- **NO se eliminan automáticamente** de la base de datos
- Se marcan con `auction_status = 'ended'`
- Se excluyen del listado de subastas activas mediante filtrado
- Permanecen en la base de datos para:
  - Historial de transacciones
  - Registro de ganadores
  - Análisis y reportes
  - Referencias a pujas realizadas

### Productos Vendidos (`status = 'sold'`)
- **NO se eliminan automáticamente** de la base de datos
- Se marcan con `status = 'sold'`
- Se excluyen del listado de productos disponibles
- Permanecen en la base de datos para:
  - Historial de ventas
  - Referencias a órdenes
  - Análisis de ventas

### Productos Archivados (`status = 'archived'`)
- **NO se eliminan automáticamente** de la base de datos
- Se marcan con `status = 'archived'`
- Se excluyen del listado público
- Pueden ser reactivados por el vendedor
- Permanecen en la base de datos para:
  - Historial del vendedor
  - Posible reactivación

## 🔄 Proceso de Filtrado

### En `getActiveAuctions()`:
1. Se excluyen subastas con:
   - `auction_status = 'ended'`
   - `auction_status = 'cancelled'`
   - `status = 'archived'`, `'sold'`, o `'deleted'`

2. Se incluyen solo subastas:
   - `auction_status = 'active'`
   - `auction_status = 'scheduled'` (si la fecha ya pasó o está muy cerca)
   - Sin `auction_status` pero con `auction_end_at` en el futuro

## 📊 Limpieza de Datos (Si se requiere)

Actualmente **NO HAY** un proceso automático de limpieza/eliminación de datos antiguos.

### Opciones para implementar limpieza:

1. **Eliminación Automática (NO RECOMENDADO)**
   - Perderías historial de transacciones
   - No podrías generar reportes históricos
   - Problemas de integridad referencial

2. **Archivado en Tabla Histórica (RECOMENDADO)**
   - Mover datos antiguos a tablas como `products_archive`, `auctions_history`
   - Mantener referencias pero mover datos pesados
   - Permite limpieza periódica sin perder información

3. **Soft Delete (ACTUAL - RECOMENDADO)**
   - Marcar como eliminados (`status = 'deleted'`)
   - Excluir de búsquedas públicas
   - Mantener en base de datos para auditoría
   - Permite recuperación si es necesario

## ⏱️ Tiempo de Retención Sugerido

Si decides implementar limpieza automática:

- **Subastas finalizadas**: Retener mínimo 1 año
- **Productos vendidos**: Retener mínimo 2 años (por temas fiscales)
- **Productos archivados**: Retener hasta que el vendedor decida eliminar
- **Productos eliminados**: Retener mínimo 90 días (período de recuperación)

## 🔍 Consultas Útiles

### Ver subastas finalizadas:
```sql
SELECT * FROM products 
WHERE sale_type = 'auction' 
  AND auction_status = 'ended'
ORDER BY auction_end_at DESC;
```

### Ver productos vendidos:
```sql
SELECT * FROM products 
WHERE status = 'sold'
ORDER BY updated_at DESC;
```

### Ver productos archivados:
```sql
SELECT * FROM products 
WHERE status = 'archived'
ORDER BY updated_at DESC;
```

## 💡 Recomendación

**MANTENER** el sistema actual de soft delete (marcar como eliminados sin borrar físicamente):
- ✅ Preserva historial completo
- ✅ Permite análisis y reportes
- ✅ Cumple con requisitos de auditoría
- ✅ No afecta significativamente el rendimiento si hay índices adecuados
- ✅ Permite recuperación de datos si es necesario

