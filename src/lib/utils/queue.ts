// ============================================
// MERCADITO ONLINE PY - SIMPLE QUEUE SYSTEM
// Sistema de colas básico para jobs asíncronos
// Para producción, migrar a Bull/BullMQ con Redis
// ============================================

type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'retrying';

interface Job<T = any> {
  id: string;
  type: string;
  data: T;
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
  createdAt: number;
  processedAt?: number;
  completedAt?: number;
  error?: Error;
  nextRetryAt?: number;
}

type JobHandler<T = any> = (data: T) => Promise<void>;

class SimpleQueue {
  private jobs: Map<string, Job> = new Map();
  private handlers: Map<string, JobHandler> = new Map();
  private processing: Set<string> = new Set();
  private maxConcurrency: number = 5;
  private defaultMaxAttempts: number = 3;
  private retryDelay: number = 5000; // 5 segundos

  /**
   * Registra un handler para un tipo de job
   */
  register<T>(type: string, handler: JobHandler<T>): void {
    this.handlers.set(type, handler);
  }

  /**
   * Agrega un job a la cola
   */
  async add<T>(
    type: string,
    data: T,
    options?: {
      maxAttempts?: number;
      delay?: number; // Delay en ms antes de procesar
    }
  ): Promise<string> {
    const jobId = crypto.randomUUID();
    const now = Date.now();

    const job: Job<T> = {
      id: jobId,
      type,
      data,
      status: 'pending',
      attempts: 0,
      maxAttempts: options?.maxAttempts || this.defaultMaxAttempts,
      createdAt: now,
      nextRetryAt: options?.delay ? now + options.delay : undefined,
    };

    this.jobs.set(jobId, job);

    // Procesar si hay capacidad
    this.processQueue();

    return jobId;
  }

  /**
   * Procesa la cola de jobs
   */
  private async processQueue(): Promise<void> {
    // Si ya estamos en el máximo de concurrencia, esperar
    if (this.processing.size >= this.maxConcurrency) {
      return;
    }

    // Buscar jobs pendientes
    const pendingJobs = Array.from(this.jobs.values())
      .filter(
        (job) =>
          job.status === 'pending' &&
          (!job.nextRetryAt || job.nextRetryAt <= Date.now())
      )
      .sort((a, b) => a.createdAt - b.createdAt); // FIFO

    // Procesar hasta el máximo de concurrencia
    for (const job of pendingJobs) {
      if (this.processing.size >= this.maxConcurrency) {
        break;
      }

      this.processJob(job);
    }
  }

  /**
   * Procesa un job individual
   */
  private async processJob(job: Job): Promise<void> {
    const handler = this.handlers.get(job.type);

    if (!handler) {
      console.warn(`⚠️ No handler registered for job type: ${job.type}`);
      job.status = 'failed';
      job.error = new Error(`No handler for type: ${job.type}`);
      return;
    }

    this.processing.add(job.id);
    job.status = 'processing';
    job.attempts++;
    job.processedAt = Date.now();

    try {
      await handler(job.data);
      
      // Éxito
      job.status = 'completed';
      job.completedAt = Date.now();
      this.processing.delete(job.id);
      
      // Limpiar job después de 1 hora
      setTimeout(() => {
        this.jobs.delete(job.id);
      }, 60 * 60 * 1000);

      // Procesar siguiente job
      this.processQueue();
    } catch (error) {
      this.processing.delete(job.id);

      // Si hay intentos restantes, reintentar
      if (job.attempts < job.maxAttempts) {
        job.status = 'retrying';
        job.nextRetryAt = Date.now() + this.retryDelay * job.attempts; // Backoff exponencial
        job.error = error instanceof Error ? error : new Error(String(error));
        
        // Reintentar después del delay
        setTimeout(() => {
          this.processQueue();
        }, this.retryDelay * job.attempts);
      } else {
        // Falló definitivamente
        job.status = 'failed';
        job.error = error instanceof Error ? error : new Error(String(error));
        console.error(`❌ Job ${job.id} failed after ${job.attempts} attempts:`, error);
      }
    }
  }

  /**
   * Obtiene el estado de un job
   */
  getJobStatus(jobId: string): Job | null {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Limpia jobs completados/failed antiguos
   */
  cleanup(maxAge: number = 24 * 60 * 60 * 1000): void {
    const now = Date.now();
    for (const [id, job] of this.jobs.entries()) {
      if (
        (job.status === 'completed' || job.status === 'failed') &&
        job.completedAt &&
        now - job.completedAt > maxAge
      ) {
        this.jobs.delete(id);
      }
    }
  }
}

// Instancia global de la cola
export const queue = new SimpleQueue();

/**
 * Tipos de jobs predefinidos
 */
export const JOB_TYPES = {
  SEND_EMAIL: 'send_email',
  SEND_NOTIFICATION: 'send_notification',
  REINDEX_PRODUCT: 'reindex_product',
  INVALIDATE_CACHE: 'invalidate_cache',
  GENERATE_THUMBNAILS: 'generate_thumbnails',
  WEBHOOK: 'webhook',
} as const;

// Limpiar jobs antiguos cada hora
if (typeof window === 'undefined') {
  setInterval(() => {
    queue.cleanup();
  }, 60 * 60 * 1000);
}


