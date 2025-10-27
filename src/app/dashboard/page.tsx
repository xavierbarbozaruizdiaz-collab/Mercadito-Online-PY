import Link from 'next/link';

export default function Dashboard() {
  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-2xl font-bold mb-6">Panel del vendedor</h1>

      <div className="grid gap-3">
        <Link
          href="/dashboard/new-product"
          className="px-4 py-2 rounded bg-black text-white w-fit"
        >
          + Nuevo producto
        </Link>

        {/* Aquí luego añadiremos:
           - /dashboard/products (mis productos)
           - /dashboard/orders (pedidos)
        */}
      </div>
    </main>
  );
}
