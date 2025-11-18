# 🚀 Guía de Configuración para Escalado Masivo (100k+ usuarios)

## 📋 Resumen

Esta guía explica qué configuraciones externas necesitás hacer para que el sistema pueda escalar automáticamente a 100,000 usuarios simultáneos cuando sea necesario.

## ✅ Lo que YA está implementado (automático)

- ✅ Sincronización de tiempo adaptativa (más frecuente durante subastas activas)
- ✅ Rate limiting para pujas (1 puja/segundo por usuario)
- ✅ Endpoint SSE (Server-Sent Events) como alternativa a WebSockets
- ✅ Estructura preparada para message queues
- ✅ Sistema de caché mejorado

## 🔧 Configuraciones que DEBÉS hacer manualmente

### 1. Supabase - Upgrade de Plan (cuando sea necesario)

**Cuándo hacerlo:** Cuando tengas más de 200 usuarios simultáneos en una subasta

**Pasos:**
1. Ir a https://supabase.com/dashboard
2. Seleccionar tu proyecto
3. Ir a Settings → Billing
4. Upgrade a plan **Pro** o **Team** (según necesidad)
   - **Pro**: Hasta 500 conexiones Realtime simultáneas
   - **Team**: Hasta 2000 conexiones Realtime simultáneas
   - **Enterprise**: Sin límite (contactar ventas)

**Costo:**
- Pro: ~$25/mes
- Team: ~$599/mes
- Enterprise: Contactar

**Nota:** El sistema funciona con el plan actual hasta ~200 usuarios. El upgrade solo es necesario cuando superes ese límite.

---

### 2. Vercel - Configurar Auto-scaling (OPCIONAL)

**Cuándo hacerlo:** Cuando tengas picos de tráfico impredecibles

**Pasos:**
1. Ir a https://vercel.com/dashboard
2. Seleccionar tu proyecto `mercadito-online-py`
3. Ir a Settings → Functions
4. Configurar:
   - **Max Duration**: 30 segundos (ya configurado)
   - **Memory**: 1024 MB (para subastas)
   - **Regions**: `iad1` (ya configurado)

**Auto-scaling:** Vercel escala automáticamente, no requiere configuración adicional.

**Costo:** Solo pagás por lo que usás. Sin tráfico = costo mínimo.

---

### 3. Redis - Configurar Caché (RECOMENDADO para 1k+ usuarios)

**Cuándo hacerlo:** Cuando tengas más de 1,000 usuarios simultáneos

**Opción A: Upstash Redis (Recomendado - Serverless)**
1. Crear cuenta en https://upstash.com
2. Crear base de datos Redis
3. Copiar URL de conexión
4. Agregar a variables de entorno en Vercel:
   ```
   REDIS_URL=redis://...
   REDIS_TOKEN=...
   ```

**Opción B: Supabase Redis (si está disponible)**
1. En Supabase Dashboard → Addons
2. Buscar Redis
3. Activar y copiar credenciales

**Costo:**
- Upstash Free: 10,000 comandos/día (gratis)
- Upstash Pay-as-you-go: ~$0.20 por 100k comandos
- Supabase Redis: Depende del plan

**Nota:** El código ya está preparado para usar Redis. Solo necesitás configurar la conexión.

---

### 4. Message Queue - AWS SQS (OPCIONAL para 10k+ usuarios)

**Cuándo hacerlo:** Cuando tengas más de 10,000 usuarios simultáneos

**Pasos:**
1. Crear cuenta en AWS (si no tenés)
2. Ir a AWS Console → SQS
3. Crear cola:
   - Nombre: `auction-bids-queue`
   - Tipo: Standard Queue
   - Región: `us-east-1` (iad1)
4. Copiar URL de la cola
5. Crear IAM User con permisos SQS
6. Agregar a variables de entorno en Vercel:
   ```
   AWS_ACCESS_KEY_ID=...
   AWS_SECRET_ACCESS_KEY=...
   AWS_REGION=us-east-1
   AWS_SQS_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/...
   ```

**Costo:**
- Primer 1 millón de requests/mes: GRATIS
- Después: $0.40 por millón de requests
- Para 100k usuarios pujando 10 veces = 1M requests = GRATIS

**Nota:** El código tiene estructura preparada. Solo necesitás descomentar y configurar.

---

### 5. Event Streaming - AWS Kinesis (OPCIONAL para 50k+ usuarios)

**Cuándo hacerlo:** Cuando tengas más de 50,000 usuarios simultáneos

**Pasos:**
1. En AWS Console → Kinesis
2. Crear Data Stream:
   - Nombre: `auction-events-stream`
   - Shards: 1 (escalar según necesidad)
3. Agregar a variables de entorno:
   ```
   AWS_KINESIS_STREAM_NAME=auction-events-stream
   ```

**Costo:**
- $0.015 por shard/hora
- 1 shard = ~1,000 records/segundo
- Para 100k usuarios: ~5-10 shards = $0.075-0.15/hora = ~$50-100/mes

**Nota:** Solo necesario para tráfico masivo. El sistema funciona sin esto hasta ~50k usuarios.

---

### 6. Cloudflare - CDN y Edge Functions (RECOMENDADO)

**Cuándo hacerlo:** Siempre (mejora performance y reduce costos)

**Pasos:**
1. Crear cuenta en Cloudflare (gratis)
2. Agregar tu dominio `mercaditoonlinepy.com`
3. Cambiar nameservers en tu registrador de dominio
4. Configurar:
   - **Caching**: Agresivo para assets estáticos
   - **Auto Minify**: CSS, JS, HTML
   - **Brotli Compression**: Activado

**Costo:**
- Plan Free: Gratis (suficiente para empezar)
- Plan Pro: $20/mes (mejor performance, más features)

**Beneficios:**
- Reduce carga en Vercel
- Mejora velocidad global
- Protección DDoS incluida

---

## 📊 Tabla de Decisión: ¿Qué configurar cuándo?

| Usuarios Simultáneos | Configuración Necesaria | Costo Aproximado |
|---------------------|------------------------|------------------|
| 0-200 | Nada (sistema actual) | $50-100/mes |
| 200-1,000 | Upgrade Supabase Pro | $75-125/mes |
| 1,000-10,000 | + Redis (Upstash) | $100-200/mes |
| 10,000-50,000 | + AWS SQS | $200-500/mes |
| 50,000-100,000 | + AWS Kinesis | $500-1,500/mes |
| 100,000+ | + Cloudflare Pro | $1,500-3,000/mes |

## 🎯 Plan de Acción Recomendado

### Fase 1: Ahora (0-200 usuarios)
- ✅ Nada que hacer
- ✅ Sistema actual funciona perfecto
- ✅ Costo: $50-100/mes

### Fase 2: Cuando llegues a 200 usuarios
- ⚙️ Upgrade Supabase a Pro
- ⚙️ Configurar Cloudflare (gratis)
- 💰 Costo: ~$75-125/mes

### Fase 3: Cuando llegues a 1,000 usuarios
- ⚙️ Agregar Redis (Upstash)
- 💰 Costo: ~$100-200/mes

### Fase 4: Cuando llegues a 10,000 usuarios
- ⚙️ Agregar AWS SQS
- 💰 Costo: ~$200-500/mes

### Fase 5: Cuando llegues a 50,000 usuarios
- ⚙️ Agregar AWS Kinesis
- 💰 Costo: ~$500-1,500/mes

## 🔍 Monitoreo: ¿Cómo saber cuándo escalar?

### Métricas a monitorear:

1. **Supabase Dashboard → Realtime**
   - Si ves "Connection limit reached" → Upgrade necesario

2. **Vercel Dashboard → Analytics**
   - Si ves errores 503 o timeouts → Considerar Redis

3. **Logs de aplicación**
   - Si ves "Rate limit exceeded" frecuentemente → Optimizar rate limiting

4. **Tiempo de respuesta de pujas**
   - Si > 2 segundos → Considerar SQS

## ⚠️ Importante

- **NO necesitás configurar todo ahora**
- El sistema escala automáticamente hasta cierto punto
- Configurá solo cuando realmente lo necesites
- Los costos son proporcionales al uso

## 📞 Soporte

Si tenés dudas sobre cuándo escalar o cómo configurar algo, revisá:
1. Los logs en Vercel Dashboard
2. Las métricas en Supabase Dashboard
3. Esta documentación

---

**Última actualización:** Noviembre 2024















