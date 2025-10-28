import ProductsListClient from '@/components/ProductsListClient';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            🛒 Mercadito Online PY
          </h1>
          <p className="text-xl md:text-2xl mb-8 opacity-90">
            Encuentra los mejores productos en Paraguay
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="#products"
              className="px-8 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              Explorar productos
            </a>
            <a
              href="/dashboard"
              className="px-8 py-3 border-2 border-white text-white rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors"
            >
              Vender productos
            </a>
          </div>
        </div>
      </div>

      {/* Products Section */}
      <div id="products" className="py-12 px-8">
        <ProductsListClient />
      </div>
    </main>
  );
}
