# 🚀 SOLUCIÓN: 10,000 PUJAS SIMULTÁNEAS

## ⚠️ PROBLEMA ACTUAL

Con el sistema actual (`FOR UPDATE NOWAIT`), si 10,000 usuarios pujan simultáneamente:
- Solo 1 puja se procesa a la vez
- 9,999 pujas se rechazan con "El sistema está procesando otra puja"
- Esto es **INACEPTABLE** para una plataforma de subastas

## ✅ SOLUCIÓN: SISTEMA DE COLA (QUEUE) + PROCESAMIENTO ASÍNCRONO

### Arquitectura Propuesta:

```
Cliente → API → Redis Queue → Worker → PostgreSQL
         (acepta todas)    (procesa en orden)
```

### Ventajas:
1. ✅ Acepta TODAS las pujas (no rechaza ninguna)
2. ✅ Procesa en orden (primero en llegar, primero en procesar)
3. ✅ Escalable (múltiples workers)
4. ✅ Resiliente (si un worker falla, otro toma la puja)

## 📋 IMPLEMENTACIÓN

### 1. Redis Queue (BullMQ o similar)
- Cola por subasta: `auction:${auctionId}:bids`
- Prioridad: pujas más altas primero
- Retry: 3 intentos automáticos

### 2. Worker Process
- Procesa pujas de la cola en orden
- Usa `FOR UPDATE SKIP LOCKED` (mejor que NOWAIT)
- Procesa en lotes de 10-50 pujas

### 3. API Endpoint (Modificado)
- Acepta la puja inmediatamente
- La agrega a la cola Redis
- Retorna `{ success: true, queued: true, position: X }`
- El cliente puede consultar el estado después

### 4. Estado de Puja
- `queued`: En cola esperando procesamiento
- `processing`: Siendo procesada
- `accepted`: Aceptada
- `rejected`: Rechazada (monto insuficiente, etc.)

## 🔧 CÓDIGO NECESARIO

### 1. Instalar dependencias:
```bash
npm install bullmq ioredis
```

### 2. Crear Queue Manager:
```typescript
// src/lib/queues/bidQueue.ts
import { Queue, Worker } from 'bullmq';
import { getRedis } from '@/lib/redis/client';

export const bidQueue = new Queue('auction-bids', {
  connection: getRedis(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
  },
});

// Worker para procesar pujas
export const bidWorker = new Worker(
  'auction-bids',
  async (job) => {
    const { auctionId, userId, amount, idempotencyKey } = job.data;
    // Llamar a place_bid RPC
    // Retornar resultado
  },
  {
    connection: getRedis(),
    concurrency: 10, // Procesar 10 pujas simultáneamente
  }
);
```

### 3. Modificar API Endpoint:
```typescript
// src/app/api/auctions/[id]/bid/route.ts
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  // ... validaciones básicas ...
  
  // Agregar a cola en vez de procesar directamente
  const job = await bidQueue.add(
    `bid-${auctionId}-${userId}`,
    {
      auctionId,
      userId,
      bidAmount,
      idempotencyKey,
      clientSentAt: new Date().toISOString(),
    },
    {
      jobId: idempotencyKey || `${auctionId}-${userId}-${Date.now()}`,
      priority: bidAmount, // Pujas más altas primero
    }
  );
  
  return NextResponse.json({
    success: true,
    queued: true,
    jobId: job.id,
    position: await job.getState(),
    message: 'Puja en cola, procesándose...',
  });
}
```

### 4. Endpoint para consultar estado:
```typescript
// src/app/api/auctions/[id]/bid/status/route.ts
export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get('jobId');
  const job = await bidQueue.getJob(jobId);
  
  if (!job) {
    return NextResponse.json({ error: 'Puja no encontrada' }, { status: 404 });
  }
  
  const state = await job.getState();
  const result = await job.returnvalue;
  
  return NextResponse.json({
    state, // 'completed', 'failed', 'waiting', 'active'
    result,
    progress: job.progress,
  });
}
```

## 🎯 ALTERNATIVA MÁS SIMPLE: SKIP LOCKED

Si no queremos implementar una cola completa, podemos usar `SKIP LOCKED`:

```sql
-- En lugar de FOR UPDATE NOWAIT
SELECT ... FOR UPDATE SKIP LOCKED;

-- Esto permite que múltiples transacciones procesen pujas en paralelo
-- sin bloquearse entre sí
```

### Ventajas de SKIP LOCKED:
- ✅ Permite procesar múltiples pujas simultáneamente
- ✅ No rechaza pujas (solo las salta si están bloqueadas)
- ✅ Más simple que una cola completa
- ✅ Funciona bien hasta ~1000 pujas simultáneas

### Desventajas:
- ⚠️ No garantiza orden estricto (pero no es crítico)
- ⚠️ Puede haber race conditions menores (manejables)

## 📊 COMPARACIÓN

| Solución | Capacidad | Complejidad | Orden Garantizado |
|----------|-----------|-------------|-------------------|
| FOR UPDATE NOWAIT (actual) | 1 puja/vez | Baja | ✅ Sí |
| FOR UPDATE SKIP LOCKED | ~1000 simultáneas | Baja | ⚠️ Aproximado |
| Queue System (BullMQ) | 10,000+ simultáneas | Alta | ✅ Sí |

## 🚀 RECOMENDACIÓN

**Para 10K pujas simultáneas:**
1. **Corto plazo**: Cambiar a `SKIP LOCKED` (implementación rápida)
2. **Mediano plazo**: Implementar Queue System con BullMQ
3. **Largo plazo**: Múltiples workers + load balancing



