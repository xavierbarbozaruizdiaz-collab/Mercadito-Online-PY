'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

type Store = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  location: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  department: string | null;
  city: string | null;
  is_active: boolean;
  settings: any;
  created_at: string;
  seller: {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
  } | null;
};

export default function AdminStoresPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'active' | 'rejected'>('pending');
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    loadStores();
  }, [filter]);

  async function loadStores() {
    setLoading(true);
    try {
      let query = supabase
        .from('stores')
        .select(`
          id,
          name,
          slug,
          description,
          location,
          contact_phone,
          contact_email,
          department,
          city,
          is_active,
          settings,
          created_at,
          seller_id
        `)
        .order('created_at', { ascending: false });

      // Aplicar filtro
      if (filter === 'pending') {
        // Tiendas pendientes: is_active = false Y verification_status = 'pending' (o null si no tiene settings)
        query = query.eq('is_active', false);
      } else if (filter === 'active') {
        query = query.eq('is_active', true);
      }

      const { data: storesData, error } = await query;

      if (error) {
        console.error('Error en query de tiendas:', error);
        throw error;
      }

      // Filtrar en memoria para 'pending': solo las que tienen verification_status = 'pending'
      let filteredData = storesData || [];
      if (filter === 'pending') {
        filteredData = filteredData.filter((store: any) => {
          const status = store.settings?.verification_status;
          // Incluir si es 'pending' o si no tiene settings (nueva tienda sin procesar)
          return status === 'pending' || (!status && store.is_active === false);
        });
      } else if (filter === 'rejected') {
        filteredData = filteredData.filter((store: any) => {
          return store.settings?.verification_status === 'rejected';
        });
      }

      // Cargar información de vendedores
      if (filteredData && filteredData.length > 0) {
        const sellerIds = [...new Set(filteredData.map((s: any) => s.seller_id).filter(Boolean))];
        const { data: sellersData } = await supabase
          .from('profiles')
          .select('id, email, first_name, last_name')
          .in('id', sellerIds);

        const sellersMap: Record<string, any> = {};
        (sellersData || []).forEach((s: any) => {
          sellersMap[s.id] = s;
        });

        const enrichedStores = filteredData.map((store: any) => ({
          ...store,
          seller: sellersMap[store.seller_id] || null,
        }));

        setStores(enrichedStores as Store[]);
      } else {
        setStores([]);
      }
    } catch (err: any) {
      console.error('Error cargando tiendas:', err);
    } finally {
      setLoading(false);
    }
  }

  async function approveStore(storeId: string) {
    if (!confirm('¿Aprobar esta tienda y activarla?')) return;

    setProcessing(storeId);
    try {
      const { error } = await (supabase as any)
        .from('stores')
        .update({
          is_active: true,
          settings: {
            verification_status: 'approved',
            approved_at: new Date().toISOString(),
          },
        })
        .eq('id', storeId);

      if (error) throw error;

      await loadStores();
    } catch (err: any) {
      console.error('Error aprobando tienda:', err);
      alert('Error al aprobar tienda: ' + (err?.message || 'Error desconocido'));
    } finally {
      setProcessing(null);
    }
  }

  async function rejectStore(storeId: string) {
    const reason = prompt('Motivo del rechazo (opcional):');
    
    setProcessing(storeId);
    try {
      const { error } = await (supabase as any)
        .from('stores')
        .update({
          is_active: false,
          settings: {
            verification_status: 'rejected',
            rejected_at: new Date().toISOString(),
            rejection_reason: reason || null,
          },
        })
        .eq('id', storeId);

      if (error) throw error;

      await loadStores();
    } catch (err: any) {
      console.error('Error rechazando tienda:', err);
      alert('Error al rechazar tienda: ' + (err?.message || 'Error desconocido'));
    } finally {
      setProcessing(null);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Verificación de Tiendas</h1>
            <p className="text-gray-600 mt-2">Aprobar o rechazar solicitudes de verificación</p>
          </div>
          <Link href="/admin" className="underline text-sm">← Volver al Admin</Link>
        </div>

        {/* Filtros */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded ${filter === 'pending' ? 'bg-yellow-500 text-white' : 'bg-white border'}`}
          >
            Pendientes
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-4 py-2 rounded ${filter === 'active' ? 'bg-green-500 text-white' : 'bg-white border'}`}
          >
            Aprobadas
          </button>
          <button
            onClick={() => setFilter('rejected')}
            className={`px-4 py-2 rounded ${filter === 'rejected' ? 'bg-red-500 text-white' : 'bg-white border'}`}
          >
            Rechazadas
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded ${filter === 'all' ? 'bg-blue-500 text-white' : 'bg-white border'}`}
          >
            Todas
          </button>
        </div>

        {/* Lista de tiendas */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
          </div>
        ) : stores.length === 0 ? (
          <div className="bg-white rounded-lg border p-8 text-center">
            <p className="text-gray-600">No hay tiendas {filter === 'pending' ? 'pendientes' : filter === 'active' ? 'aprobadas' : ''}</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {stores.map((store) => {
              const status = store.is_active ? 'active' : (store.settings?.verification_status === 'rejected' ? 'rejected' : 'pending');
              
              return (
                <div key={store.id} className="bg-white rounded-lg border p-6 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-1">{store.name}</h3>
                      {store.seller && (
                        <p className="text-sm text-gray-600">
                          Vendedor: {store.seller.first_name || ''} {store.seller.last_name || ''} ({store.seller.email})
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        Solicitado: {new Date(store.created_at).toLocaleDateString('es-PY')}
                      </p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm ${
                      status === 'active' ? 'bg-green-100 text-green-800' :
                      status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {status === 'active' ? '✅ Aprobada' : status === 'rejected' ? '❌ Rechazada' : '⏳ Pendiente'}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Descripción:</p>
                      <p className="text-sm text-gray-600">{store.description || 'Sin descripción'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Ubicación:</p>
                      <p className="text-sm text-gray-600">
                        {store.department && store.city ? `${store.city}, ${store.department}` : store.location || 'No especificada'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Teléfono:</p>
                      <p className="text-sm text-gray-600">{store.contact_phone || 'No especificado'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Email:</p>
                      <p className="text-sm text-gray-600">{store.contact_email || 'No especificado'}</p>
                    </div>
                  </div>

                  {store.settings?.rejection_reason && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
                      <p className="text-sm font-medium text-red-800">Motivo de rechazo:</p>
                      <p className="text-sm text-red-600">{store.settings.rejection_reason}</p>
                    </div>
                  )}

                  {status === 'pending' && (
                    <div className="flex gap-3 pt-4 border-t">
                      <button
                        onClick={() => approveStore(store.id)}
                        disabled={processing === store.id}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {processing === store.id ? 'Procesando...' : '✅ Aprobar'}
                      </button>
                      <button
                        onClick={() => rejectStore(store.id)}
                        disabled={processing === store.id}
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {processing === store.id ? 'Procesando...' : '❌ Rechazar'}
                      </button>
                      <Link
                        href={`/store/${store.slug}?admin=true`}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                        target="_blank"
                      >
                        👁️ Ver tienda
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

