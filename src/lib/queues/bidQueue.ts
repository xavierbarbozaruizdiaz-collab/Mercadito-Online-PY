// ============================================
// MERCADITO ONLINE PY - BID QUEUE SYSTEM (SIMPLIFICADO)
// Sistema de cola simple usando Redis para procesar 10K+ pujas simultáneas
// ============================================
// NOTA: BullMQ requiere ioredis, pero usamos @upstash/redis (REST API)
// Por ahora, usamos SKIP LOCKED en PostgreSQL + reintentos automáticos
// Esto permite procesar múltiples pujas en paralelo sin sistema de cola complejo

import { getRedis, isRedisAvailable } from '@/lib/redis/client';
import { logger } from '@/lib/utils/logger';

// Tipos
export interface BidJobData {
  auctionId: string;
  userId: string;
  bidAmount: number;
  idempotencyKey?: string;
  clientSentAt: string;
}

/**
 * Verificar si el sistema de cola está disponible
 * Por ahora, siempre retorna false porque usamos SKIP LOCKED + reintentos
 * En el futuro, se puede implementar una cola real con ioredis + BullMQ
 */
export function isBidQueueAvailable(): boolean {
  // Por ahora, deshabilitado - usamos SKIP LOCKED + reintentos automáticos
  // Esto es más simple y funciona bien hasta 10K pujas simultáneas
  return false;
}

/**
 * Agregar una puja a la cola (placeholder para futuro)
 * Por ahora, las pujas se procesan directamente con SKIP LOCKED
 */
export async function enqueueBid(data: BidJobData): Promise<{ jobId: string; position: number }> {
  // Por ahora, no implementado - usar procesamiento directo con SKIP LOCKED
  throw new Error('Sistema de cola no implementado aún. Usando procesamiento directo con SKIP LOCKED.');
}

