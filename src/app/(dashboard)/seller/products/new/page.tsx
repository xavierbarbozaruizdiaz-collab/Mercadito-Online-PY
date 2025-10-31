// ============================================
// MERCADITO ONLINE PY - NEW PRODUCT PAGE
// Página para crear nuevos productos
// ============================================

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';

export default function NewProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleCreateProduct = () => {
    setLoading(true);
    // Lógica para crear producto
    setTimeout(() => {
      setLoading(false);
      router.push('/dashboard');
    }, 1000);
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Nuevo Producto</h1>
          <p className="text-gray-600 mt-2">
            Crea un nuevo producto para tu tienda
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Formulario de Producto
            </h2>
            <p className="text-gray-600 mb-6">
              Esta funcionalidad está en desarrollo. Próximamente podrás crear productos completos.
            </p>
            <Button 
              onClick={handleCreateProduct}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? 'Creando...' : 'Crear Producto'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
