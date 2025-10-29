# 🛒 Mercadito Online PY

Marketplace completo desarrollado con Next.js 16, React 19 y Supabase, diseñado específicamente para el mercado paraguayo.

## ✨ Características Principales

- 🛍️ **E-commerce Core**: Sistema completo de productos, carrito, checkout y órdenes
- 🏪 **Marketplace**: Tiendas públicas, perfiles de vendedores y búsqueda avanzada
- 💬 **Chat en Tiempo Real**: Sistema de mensajería entre compradores y vendedores
- 🔍 **Búsqueda Inteligente**: Filtros, sugerencias automáticas y trending
- 📊 **Analytics**: Tracking completo de eventos y métricas de performance
- 🔐 **Seguridad**: Row Level Security (RLS), autenticación robusta
- 🎨 **UI Moderna**: Tailwind CSS v4 + ShadCN UI
- 📱 **PWA**: Aplicación web progresiva con soporte offline
- 🔍 **SEO Optimizado**: Metadatos dinámicos, sitemap, structured data
- ✅ **Testing**: Tests E2E con Playwright
- 🚀 **CI/CD**: Pipeline automatizado con GitHub Actions

## 🛠️ Tecnologías

### Frontend
- **Next.js 16** - Framework React con App Router
- **React 19** - Biblioteca UI
- **TypeScript** - Tipado estático
- **Tailwind CSS v4** - Estilos utilitarios
- **ShadCN UI** - Componentes UI

### Backend
- **Supabase** - Backend as a Service
- **PostgreSQL** - Base de datos relacional
- **Row Level Security** - Seguridad a nivel de fila
- **Supabase Storage** - Almacenamiento de imágenes
- **Supabase Realtime** - Funcionalidades en tiempo real

### Herramientas
- **Playwright** - Testing E2E
- **ESLint** - Linting
- **GitHub Actions** - CI/CD
- **Vercel** - Deployment (recomendado)

## 🚀 Inicio Rápido

### Prerrequisitos
- Node.js 18+ 
- npm, yarn, pnpm o bun
- Cuenta de Supabase

### Instalación

1. **Clonar el repositorio**
```bash
git clone https://github.com/tu-usuario/mercadito-online-py.git
cd mercadito-online-py
```

2. **Instalar dependencias**
```bash
npm install
# o
yarn install
# o
pnpm install
```

3. **Configurar variables de entorno**
```bash
cp env.example .env.local
```

Edita `.env.local` con tus credenciales de Supabase:
```env
NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key
```

4. **Configurar base de datos**
```bash
# Aplicar migraciones
npx supabase db push
```

5. **Ejecutar en desarrollo**
```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## 📁 Estructura del Proyecto

```
mercadito-online-py/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (dashboard)/        # Rutas protegidas del dashboard
│   │   ├── (marketplace)/     # Rutas públicas del marketplace
│   │   ├── auth/              # Autenticación
│   │   ├── products/          # Páginas de productos
│   │   ├── chat/              # Sistema de chat
│   │   ├── admin/             # Panel de administración
│   │   └── ...
│   ├── components/            # Componentes React
│   │   ├── ui/                # Componentes UI base
│   │   └── ...
│   ├── lib/                   # Utilidades y servicios
│   │   ├── hooks/             # Custom hooks
│   │   ├── services/          # Servicios de API
│   │   └── ...
│   └── types/                 # Definiciones TypeScript
├── supabase/
│   ├── migrations/            # Migraciones de DB
│   └── config.toml           # Configuración Supabase
├── tests/                     # Tests E2E
├── .github/workflows/         # CI/CD
└── ...
```

## 📚 Documentación

- 📖 [Guía de Usuario](./USER_GUIDE.md) - Cómo usar la plataforma
- 📡 [Documentación de API](./API_DOCUMENTATION.md) - Endpoints y servicios
- 🔧 [Troubleshooting](./TROUBLESHOOTING.md) - Solución de problemas comunes
- 🚀 [Guía de Deployment](./DEPLOYMENT.md) - Cómo desplegar en producción
- 📋 [Documentación Técnica](./TECHNICAL_DOCUMENTATION.md) - Arquitectura y detalles técnicos
- 📊 [Fases del Proyecto](./PROJECT_PHASES.md) - Estado de implementación

## 🧪 Testing

### Ejecutar tests E2E
```bash
npm run test:e2e
```

### Ejecutar tests en modo UI
```bash
npm run test:e2e:ui
```

### Ejecutar tests en modo headed
```bash
npm run test:e2e:headed
```

## 🏗️ Build

### Build para producción
```bash
npm run build
```

### Iniciar servidor de producción
```bash
npm start
```

## 🚀 Deployment

### Vercel (Recomendado)
```bash
npm i -g vercel
vercel --prod
```

Ver [DEPLOYMENT.md](./DEPLOYMENT.md) para más opciones de deployment.

## 🗺️ Roadmap

- ✅ Fase 1: Core E-commerce
- ✅ Fase 2: Marketplace y Tiendas
- ✅ Fase 3: Sistema de Chat
- ✅ Fase 4: Optimización y SEO
- ✅ Fase 5: Testing, QA y Deployment
- ✅ Fase 6: Optimizaciones Avanzadas y Producción
- ✅ Fase 7: Documentación Final y Entrega

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

## 👥 Autores

- **Tu Nombre** - *Desarrollo inicial*

## 🙏 Agradecimientos

- Next.js team por el excelente framework
- Supabase por la infraestructura de backend
- La comunidad de código abierto

---

**Versión**: 1.0.0  
**Última actualización**: Enero 2025
