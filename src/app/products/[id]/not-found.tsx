import Link from 'next/link';
import { AlertCircle, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 sm:p-12 text-center max-w-md w-full border border-gray-200">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-8 h-8 text-red-600" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
          Producto no encontrado
        </h1>
        <p className="text-gray-600 mb-8">
          El producto que estás buscando no existe o fue eliminado. Verificá el enlace o volvé al inicio.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
        >
          <Home className="w-5 h-5" />
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
