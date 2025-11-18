# ⚡ Inicio Rápido: Configuraciones Externas Necesarias

## ✅ Lo que YA está hecho (automático)

- ✅ Sincronización de tiempo mejorada (más frecuente durante subastas)
- ✅ Rate limiting implementado (1 puja/segundo por usuario)
- ✅ Endpoint SSE creado (`/api/auctions/[id]/stream`)
- ✅ Sistema preparado para escalar

## 🔧 Lo que DEBÉS hacer manualmente (cuando sea necesario)

### 1. Supabase - Upgrade de Plan

**Cuándo:** Cuando tengas más de 200 usuarios simultáneos

**Cómo:**
1. Ir a https://supabase.com/dashboard
2. Tu proyecto → Settings → Billing
3. Upgrade a **Pro** ($25/mes) o **Team** ($599/mes)

**Nota:** Funciona bien hasta 200 usuarios sin cambios.

---

### 2. Cloudflare (Recomendado - Gratis)

**Cuándo:** Siempre (mejora performance)

**Cómo:**
1. Crear cuenta en https://cloudflare.com (gratis)
2. Agregar dominio `mercaditoonlinepy.com`
3. Cambiar nameservers en tu registrador
4. Activar Auto Minify y Brotli

**Costo:** Gratis (plan básico suficiente)

---

### 3. Redis - Upstash (Opcional)

**Cuándo:** Cuando tengas más de 1,000 usuarios simultáneos

**Cómo:**
1. Crear cuenta en https://upstash.com
2. Crear base de datos Redis
3. Copiar URL y Token
4. Agregar a Vercel → Settings → Environment Variables:
   ```
   REDIS_URL=redis://...
   REDIS_TOKEN=...
   ```

**Costo:** Gratis hasta 10k comandos/día, luego ~$0.20 por 100k comandos

---

### 4. AWS SQS (Opcional - Solo para 10k+ usuarios)

**Cuándo:** Cuando tengas más de 10,000 usuarios simultáneos

**Cómo:**
1. Crear cuenta AWS
2. Ir a SQS → Create Queue
3. Nombre: `auction-bids-queue`
4. Crear IAM User con permisos SQS
5. Agregar a Vercel Environment Variables:
   ```
   AWS_ACCESS_KEY_ID=...
   AWS_SECRET_ACCESS_KEY=...
   AWS_REGION=us-east-1
   AWS_SQS_QUEUE_URL=https://sqs...
   ```

**Costo:** Primer millón de requests/mes GRATIS

---

## 📊 Resumen de Costos

| Escenario | Configuración | Costo Mensual |
|-----------|--------------|---------------|
| 0-200 usuarios | Nada | $50-100 |
| 200-1k usuarios | Supabase Pro + Cloudflare | $75-125 |
| 1k-10k usuarios | + Redis | $100-200 |
| 10k-50k usuarios | + AWS SQS | $200-500 |
| 50k-100k usuarios | + AWS Kinesis | $500-1,500 |

## 🎯 Plan de Acción

1. **Ahora:** Nada que hacer, sistema funciona perfecto
2. **Cuando llegues a 200 usuarios:** Upgrade Supabase + Cloudflare
3. **Cuando llegues a 1,000 usuarios:** Agregar Redis
4. **Cuando llegues a 10,000 usuarios:** Agregar AWS SQS

## 📖 Documentación Completa

Ver `docs/SCALING_SETUP.md` para detalles completos.















