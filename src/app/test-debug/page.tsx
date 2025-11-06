// ============================================
// PÁGINA DE PRUEBA DE DEBUG
// Esta página SIEMPRE debe mostrar el banner
// ============================================

import { unstable_noStore as noStore } from 'next/cache';

// FORZAR RENDER DINÁMICO
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export default function TestDebugPage() {
  // Deshabilitar cache completamente
  noStore();
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="w-full h-96 bg-gradient-to-r from-red-600 to-orange-600 flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-4xl font-bold mb-4">✅ ESTA PÁGINA FUNCIONA</h1>
          <p className="text-xl">Si ves esto, Next.js está funcionando correctamente</p>
          <p className="text-sm mt-4 opacity-75">Ruta: /test-debug</p>
          <p className="text-sm opacity-75">Timestamp: {new Date().toISOString()}</p>
        </div>
      </div>
      
      <div className="p-8">
        <h2 className="text-2xl font-bold mb-4">Verificación de Cambios</h2>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="mb-2"><strong>Commit:</strong> 865b6fa</p>
          <p className="mb-2"><strong>Fecha:</strong> {new Date().toISOString()}</p>
          <p className="mb-2"><strong>NODE_ENV:</strong> {process.env.NODE_ENV || 'undefined'}</p>
          <p className="mb-2"><strong>Build ID:</strong> {process.env.NEXT_PUBLIC_VERCEL_ENV || 'local'}</p>
        </div>
      </div>
    </main>
  );
}

