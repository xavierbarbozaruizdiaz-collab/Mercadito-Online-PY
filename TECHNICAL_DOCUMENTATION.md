# 🛒 Mercadito Online PY - Documentación Técnica

## 📋 Índice
1. [Resumen del Proyecto](#resumen-del-proyecto)
2. [Arquitectura](#arquitectura)
3. [Tecnologías](#tecnologías)
4. [Estructura del Proyecto](#estructura-del-proyecto)
5. [Configuración](#configuración)
6. [Desarrollo](#desarrollo)
7. [Testing](#testing)
8. [Deployment](#deployment)
9. [Monitoreo](#monitoreo)
10. [API Reference](#api-reference)

## 🎯 Resumen del Proyecto

**Mercadito Online PY** es un marketplace completo desarrollado con Next.js 16 y Supabase, diseñado específicamente para el mercado paraguayo. La aplicación permite a usuarios comprar y vender productos nuevos y usados de forma segura.

### Características Principales
- ✅ **E-commerce Core**: Productos, carrito, checkout, órdenes
- ✅ **Marketplace**: Tiendas públicas, perfiles de vendedores
- ✅ **Búsqueda Avanzada**: Filtros, sugerencias, trending
- ✅ **Sistema de Chat**: Mensajería en tiempo real
- ✅ **SEO Optimizado**: Metadatos dinámicos, sitemap, structured data
- ✅ **Analytics**: Tracking completo de eventos y métricas
- ✅ **Testing**: E2E tests con Playwright
- ✅ **CI/CD**: Pipeline automatizado con GitHub Actions

## 🏗️ Arquitectura

### Frontend
- **Framework**: Next.js 16 con App Router
- **UI**: Tailwind CSS v4 + ShadCN UI
- **Estado**: React Hooks + Context API
- **Autenticación**: Supabase Auth

### Backend
- **Database**: PostgreSQL (Supabase)
- **Auth**: Supabase Auth con RLS
- **Storage**: Supabase Storage para imágenes
- **Realtime**: Supabase Realtime para chat

### Infraestructura
- **Hosting**: Vercel (recomendado)
- **CDN**: Vercel Edge Network
- **Monitoring**: Analytics personalizado + Supabase

## 🛠️ Tecnologías

### Core
- **Next.js 16.0.0** - Framework React
- **React 19.2.0** - Biblioteca UI
- **TypeScript** - Tipado estático
- **Tailwind CSS v4** - Estilos

### Backend
- **Supabase** - BaaS (Backend as a Service)
- **PostgreSQL** - Base de datos
- **Row Level Security (RLS)** - Seguridad

### Testing
- **Playwright** - E2E Testing
- **GitHub Actions** - CI/CD

### Herramientas
- **ESLint** - Linting
- **Prettier** - Formateo
- **Git** - Control de versiones

## 📁 Estructura del Proyecto

```
mercadito-online-py/
├── src/
│   ├── app/                    # App Router (Next.js 16)
│   │   ├── (dashboard)/       # Rutas protegidas del dashboard
│   │   ├── (marketplace)/     # Rutas públicas del marketplace
│   │   ├── auth/              # Autenticación
│   │   ├── products/          # Páginas de productos
│   │   ├── chat/              # Sistema de chat
│   │   ├── admin/             # Panel de administración
│   │   ├── layout.tsx         # Layout principal
│   │   ├── page.tsx           # Página principal
│   │   ├── sitemap.ts         # Sitemap dinámico
│   │   └── robots.ts          # Robots.txt
│   ├── components/            # Componentes React
│   │   ├── ui/                # Componentes UI base
│   │   ├── Chat.tsx           # Sistema de chat
│   │   ├── AnalyticsProvider.tsx
│   │   └── ...
│   ├── lib/                   # Utilidades y servicios
│   │   ├── hooks/             # Custom hooks
│   │   ├── services/          # Servicios de API
│   │   ├── utils/             # Funciones utilitarias
│   │   └── supabase/          # Cliente Supabase
│   └── types/                 # Definiciones TypeScript
├── supabase/
│   ├── migrations/            # Migraciones de DB
│   └── config.toml           # Configuración Supabase
├── tests/                     # Tests E2E
├── .github/workflows/         # CI/CD
├── next.config.js            # Configuración Next.js
├── playwright.config.ts      # Configuración Playwright
└── package.json
```

## ⚙️ Configuración

### 1. Variables de Entorno

Crear archivo `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
```

### 2. Instalación

```bash
# Instalar dependencias
npm install

# Instalar Playwright
npx playwright install

# Configurar Supabase
supabase login
supabase link --project-ref tu-proyecto-ref
```

### 3. Base de Datos

```bash
# Aplicar migraciones
supabase db push

# Generar tipos TypeScript
supabase gen types typescript --local > src/types/database.ts
```

## 🚀 Desarrollo

### Comandos Disponibles

```bash
# Desarrollo
npm run dev          # Servidor de desarrollo

# Build
npm run build        # Build de producción
npm run start        # Servidor de producción

# Testing
npm run test         # Tests E2E
npm run test:ui      # Tests con UI

# Linting
npm run lint         # ESLint
npm run lint:fix     # Fix automático

# Base de datos
supabase db push     # Aplicar migraciones
supabase db reset    # Reset completo
```

### Flujo de Desarrollo

1. **Crear feature branch**
   ```bash
   git checkout -b feature/nueva-funcionalidad
   ```

2. **Desarrollar funcionalidad**
   - Escribir código
   - Agregar tests
   - Actualizar documentación

3. **Testing local**
   ```bash
   npm run lint
   npm run test
   ```

4. **Commit y push**
   ```bash
   git add .
   git commit -m "feat: nueva funcionalidad"
   git push origin feature/nueva-funcionalidad
   ```

5. **Crear Pull Request**
   - GitHub Actions ejecutará CI/CD
   - Revisión de código
   - Merge a main

## 🧪 Testing

### E2E Tests con Playwright

Los tests están ubicados en `tests/e2e.spec.ts` y cubren:

- ✅ Navegación básica
- ✅ Autenticación
- ✅ Productos y carrito
- ✅ Búsqueda
- ✅ Responsive design
- ✅ SEO y metadatos
- ✅ Performance básico
- ✅ Accesibilidad

### Ejecutar Tests

```bash
# Tests completos
npx playwright test

# Tests específicos
npx playwright test tests/e2e.spec.ts

# Tests con UI
npx playwright test --ui

# Tests en modo debug
npx playwright test --debug
```

### Configuración de Tests

El archivo `playwright.config.ts` incluye:
- Configuración para múltiples navegadores
- Tests en desktop y móvil
- Screenshots en fallos
- Traces para debugging

## 🚀 Deployment

### Vercel (Recomendado)

1. **Conectar repositorio**
   - Importar proyecto en Vercel
   - Conectar con GitHub

2. **Configurar variables de entorno**
   ```env
   NEXT_PUBLIC_SUPABASE_URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY
   SUPABASE_SERVICE_ROLE_KEY
   ```

3. **Deploy automático**
   - Push a `main` → Deploy automático
   - Preview deployments en PRs

### GitHub Actions

El pipeline CI/CD incluye:

1. **Linting y Type Checking**
2. **Build y Tests**
3. **Security Audit**
4. **Deploy a Vercel**
5. **Post-deployment Tests**

### Configuración de Secrets

En GitHub Settings → Secrets:

```
VERCEL_TOKEN=tu-vercel-token
VERCEL_ORG_ID=tu-org-id
VERCEL_PROJECT_ID=tu-project-id
NEXT_PUBLIC_SUPABASE_URL=tu-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
SNYK_TOKEN=tu-snyk-token
SLACK_WEBHOOK_URL=tu-slack-webhook
```

## 📊 Monitoreo

### Analytics

El sistema incluye tracking completo:

- **Eventos de usuario**: page views, clicks, searches
- **Métricas de rendimiento**: Core Web Vitals
- **Errores**: JavaScript errors, API failures
- **Business metrics**: conversiones, engagement

### Dashboard de Analytics

Acceder a analytics en `/admin/analytics` (requiere rol admin).

### Alertas

- **Slack**: Notificaciones de deployment
- **Email**: Alertas de errores críticos
- **Dashboard**: Métricas en tiempo real

## 📚 API Reference

### Supabase Tables

#### `products`
```sql
id: uuid (PK)
title: text
description: text
price: numeric
cover_url: text
condition: text
sale_type: text
category_id: uuid (FK)
seller_id: uuid (FK)
created_at: timestamp
updated_at: timestamp
```

#### `conversations`
```sql
id: uuid (PK)
buyer_id: uuid (FK)
seller_id: uuid (FK)
product_id: uuid (FK)
status: text
last_message_at: timestamp
created_at: timestamp
```

#### `analytics_events`
```sql
id: uuid (PK)
event_type: text
event_data: jsonb
page_url: text
user_id: uuid (FK)
session_id: text
timestamp: timestamp
```

### Custom Functions

#### `create_order_from_cart()`
Crea una orden desde el carrito del usuario.

#### `get_analytics_stats(start_date, end_date)`
Retorna estadísticas de analytics para un período.

#### `cleanup_old_analytics_data()`
Limpia datos de analytics antiguos (>90 días).

## 🔒 Seguridad

### Row Level Security (RLS)

Todas las tablas tienen RLS habilitado:

- **Usuarios**: Solo pueden ver/editar sus propios datos
- **Productos**: Públicos para lectura, solo vendedor para edición
- **Conversaciones**: Solo participantes pueden acceder
- **Analytics**: Insert público, lectura solo para admins

### Headers de Seguridad

Configurados en `next.config.js`:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: origin-when-cross-origin`

## 🐛 Troubleshooting

### Problemas Comunes

#### 1. Error de Supabase Connection
```bash
# Verificar variables de entorno
echo $NEXT_PUBLIC_SUPABASE_URL

# Verificar migraciones
supabase db push
```

#### 2. Tests Fallando
```bash
# Limpiar cache
npx playwright install --force

# Verificar servidor local
npm run dev
```

#### 3. Build Errors
```bash
# Limpiar cache
rm -rf .next
npm run build
```

### Logs y Debugging

- **Desarrollo**: Console logs en browser
- **Producción**: Vercel Function Logs
- **Base de datos**: Supabase Dashboard → Logs
- **Analytics**: Tabla `error_logs`

## 📞 Soporte

### Documentación Adicional

- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Playwright Docs](https://playwright.dev/docs)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)

### Contacto

Para soporte técnico o preguntas sobre el proyecto, contactar al equipo de desarrollo.

---

**Última actualización**: Enero 2025  
**Versión**: 1.0.0  
**Estado**: Producción Ready ✅
