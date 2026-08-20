import AnalyticsDashboard from '@/components/AnalyticsDashboard';
import AdminUbuyStoreCard from '@/components/admin/AdminUbuyStoreCard';
import Link from 'next/link';

type AdminLink = {
  href: string;
  title: string;
  description: string;
};

const SECTIONS: { title: string; subtitle: string; items: AdminLink[] }[] = [
  {
    title: 'Operación diaria',
    subtitle: 'Lo que usás más seguido',
    items: [
      {
        href: '/admin/orders',
        title: 'Pedidos',
        description: 'Ver órdenes, disputas y seguimiento',
      },
      {
        href: '/admin/products',
        title: 'Productos',
        description: 'Aprobar y revisar publicaciones',
      },
      {
        href: '/admin/stores',
        title: 'Tiendas',
        description: 'Aprobar o rechazar vendedores. La fallback es la tienda Ubuy del admin',
      },
      {
        href: '/dashboard/sourced-catalog',
        title: 'Catálogo Ubuy',
        description: 'Tienda oficial del admin: importar AliExpress',
      },
      {
        href: '/dashboard/sourced-fulfillments',
        title: 'Fulfillment Ubuy',
        description: 'Comprar en origen y cargar tracking',
      },
      {
        href: '/admin/users',
        title: 'Usuarios',
        description: 'Cuentas, roles y acceso',
      },
      {
        href: '/admin/deliveries',
        title: 'Entregas',
        description: 'Envíos y estado de entrega',
      },
      {
        href: '/admin/reports',
        title: 'Denuncias',
        description: 'Revisar reportes de la comunidad',
      },
    ],
  },
  {
    title: 'Apariencia y contenido',
    subtitle: 'Cómo se ve el sitio',
    items: [
      {
        href: '/dashboard/admin/hero',
        title: 'Portada del inicio',
        description: 'Fotos y textos del carrusel principal',
      },
      {
        href: '/admin/banners',
        title: 'Banners',
        description: 'Promociones y avisos visuales',
      },
      {
        href: '/admin/categories',
        title: 'Categorías',
        description: 'Organizar el catálogo',
      },
      {
        href: '/admin/marketing/catalogo-vitrina',
        title: 'Catálogo vitrina',
        description: 'Productos destacados en la vitrina',
      },
      {
        href: '/admin/pages',
        title: 'Páginas legales',
        description: 'Términos, privacidad y contenido',
      },
      {
        href: '/admin/notifications',
        title: 'Avisos masivos',
        description: 'Mensajes a muchos usuarios',
      },
    ],
  },
  {
    title: 'Dinero y crecimiento',
    subtitle: 'Cobros, comisiones y campañas',
    items: [
      {
        href: '/admin/payouts',
        title: 'Pagos a vendedores',
        description: 'Retiros y liquidaciones',
      },
      {
        href: '/admin/commissions',
        title: 'Comisiones',
        description: 'Reglas y reportes de comisión',
      },
      {
        href: '/admin/memberships',
        title: 'Membresías',
        description: 'Planes y beneficios',
      },
      {
        href: '/admin/raffles',
        title: 'Sorteos',
        description: 'Crear y administrar sorteos',
      },
      {
        href: '/admin/influencers',
        title: 'Influencers',
        description: 'Socios y comisiones de referidos',
      },
      {
        href: '/admin/penalties',
        title: 'Penalizaciones',
        description: 'Multas y sanciones',
      },
    ],
  },
  {
    title: 'Sistema',
    subtitle: 'Ajustes y seguridad',
    items: [
      {
        href: '/admin/settings',
        title: 'Ajustes del sitio',
        description: 'Configuración general',
      },
      {
        href: '/admin/security',
        title: 'Seguridad',
        description: 'Controles de seguridad',
      },
      {
        href: '/admin/logs',
        title: 'Actividad',
        description: 'Registro de acciones importantes',
      },
      {
        href: '/admin/backups',
        title: 'Respaldo',
        description: 'Copias de seguridad',
      },
    ],
  },
];

function AdminCard({ item }: { item: AdminLink }) {
  return (
    <Link
      href={item.href}
      className="group block rounded-2xl border border-[hsl(var(--border))] bg-white p-5 transition-all hover:border-[hsl(var(--primary))]/40 hover:shadow-md"
    >
      <h3 className="text-base font-semibold text-[hsl(var(--foreground))] group-hover:text-[hsl(var(--primary))]">
        {item.title}
      </h3>
      <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">
        {item.description}
      </p>
    </Link>
  );
}

export default function AdminDashboardPage() {
  return (
    <div className="space-y-10">
      <section className="rounded-2xl border border-[hsl(var(--border))] bg-gradient-to-br from-emerald-50 to-white p-6 sm:p-8">
        <p className="text-sm font-medium text-[hsl(var(--primary))] mb-2">Mercadito Online PY</p>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[hsl(var(--foreground))]">
          Panel de control
        </h1>
        <p className="mt-2 text-[hsl(var(--muted-foreground))] max-w-2xl">
          Desde acá manejás pedidos, tiendas, la portada del inicio y el día a día del marketplace.
        </p>
      </section>

      <AdminUbuyStoreCard />

      {SECTIONS.map((section) => (
        <section key={section.title} className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">{section.title}</h2>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">{section.subtitle}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {section.items.map((item) => (
              <AdminCard key={item.href} item={item} />
            ))}
          </div>
        </section>
      ))}

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">Números del negocio</h2>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Resumen de actividad del marketplace
          </p>
        </div>
        <AnalyticsDashboard />
      </section>
    </div>
  );
}
