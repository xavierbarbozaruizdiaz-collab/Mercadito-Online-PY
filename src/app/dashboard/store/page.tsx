'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function StoreEditPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirigir al formulario unificado de perfil
    router.replace('/dashboard/profile');
  }, [router]);

  return (
    <main className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
        <p className="text-gray-600">Redirigiendo al formulario unificado...</p>
      </div>
    </main>
  );
}
