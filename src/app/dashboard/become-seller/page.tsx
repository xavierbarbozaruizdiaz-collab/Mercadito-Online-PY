'use client';

import { useState, useEffect } from 'react';
import { supabase, getSessionWithTimeout } from '@/lib/supabaseClient';
import Link from 'next/link';

export default function BecomeSellerPage() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [hasExistingStore, setHasExistingStore] = useState(false);
  const [isRejected, setIsRejected] = useState(false);

  useEffect(() => {
    checkExistingStore();
  }, []);

  async function checkExistingStore() {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user?.id) return;

      const { data: store } = await supabase
        .from('stores')
        .select('settings, is_active')
        .eq('seller_id', session.session.user.id)
        .maybeSingle();

      if (store) {
        setHasExistingStore(true);
        const s: any = store as any;
        setIsRejected(s.settings?.verification_status === 'rejected');
      }
    } catch (e) {
      console.error('Error verificando tienda:', e);
    }
  }

  async function requestVerification() {
    setLoading(true);
    setMsg(null);
    try {
      // Obtener usuario actual
      let { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user?.id) {
        const res = await getSessionWithTimeout();
        session = res.data as any;
      }
      const userId = session?.session?.user?.id;
      if (!userId) throw new Error('Debes iniciar sesión');

      // 1) Elevar rol a seller
      const { error: roleErr } = await (supabase as any)
        .from('profiles')
        .update({ role: 'seller' })
        .eq('id', userId);
      if (roleErr) throw roleErr;

      // 2) Crear tienda si no existe
      const { data: existing, error: fetchErr } = await supabase
        .from('stores')
        .select('id, settings')
        .eq('seller_id', userId)
        .maybeSingle();
      if (fetchErr) throw fetchErr;

      if (!existing) {
        // Obtener nombre del perfil para generar nombre de tienda
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', userId)
          .single();
        
        const profileName = profile 
          ? `${(profile as any).first_name || ''} ${(profile as any).last_name || ''}`.trim()
          : null;
        const defaultName = profileName || session?.session?.user?.email?.split('@')[0] || 'Tienda';
        
        // Generar slug desde el nombre
        const slug = defaultName
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
        
        console.log('📦 Creando nueva tienda:', { seller_id: userId, name: defaultName, slug });
        
        const { data: newStore, error: createErr } = await (supabase as any)
          .from('stores')
          .insert({
            seller_id: userId,
            name: defaultName,
            slug: slug,
            is_active: false,
            settings: { verification_status: 'pending', requested_at: new Date().toISOString() },
          })
          .select()
          .single();
        
        if (createErr) {
          console.error('❌ Error creando tienda:', createErr);
          throw new Error(`Error al crear tienda: ${createErr.message || 'Error desconocido'}`);
        }
        console.log('✅ Tienda creada:', newStore?.id);
      } else {
        const existingStore: any = existing as any;
        console.log('📝 Actualizando tienda existente:', existingStore.id);
        
        const { error: updateErr } = await (supabase as any)
          .from('stores')
          .update({
            is_active: false,
            settings: {
              ...(existingStore.settings || {}),
              verification_status: 'pending',
              requested_at: new Date().toISOString(),
            },
          })
          .eq('id', existingStore.id);
        
        if (updateErr) {
          console.error('❌ Error actualizando tienda:', updateErr);
          throw new Error(`Error al actualizar tienda: ${updateErr.message || 'Error desconocido'}`);
        }
        console.log('✅ Tienda actualizada');
      }

      setMsg({ type: 'success', text: 'Solicitud enviada. Revisaremos tu verificación.' });
      setTimeout(() => { window.location.href = '/dashboard/store'; }, 1200);
    } catch (err: any) {
      setMsg({ type: 'error', text: err?.message || 'No se pudo enviar la solicitud' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Convertirme en Tienda</h1>
          <Link href="/dashboard" className="underline text-sm">← Volver</Link>
        </div>

        {msg && (
          <div className={`mb-4 p-3 rounded ${msg.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {msg.text}
          </div>
        )}

        <div className="bg-white border rounded-xl p-6 shadow-sm space-y-4">
          {isRejected && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-800 font-medium mb-2">Solicitud anterior rechazada</p>
              <p className="text-sm text-red-700">
                Puedes volver a solicitar la verificación. Asegúrate de completar toda la información de tu tienda.
              </p>
            </div>
          )}
          {hasExistingStore && !isRejected && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-800">
                Ya tienes una tienda creada. Esta solicitud actualizará tu estado de verificación.
              </p>
            </div>
          )}
          <p>
            Como usuario particular puedes vender con tu perfil. Si quieres operar como tienda con local físico,
            necesitas suscribirte y solicitar una verificación del lugar.
          </p>
          <ul className="list-disc pl-5 text-sm text-gray-700">
            <li>Tu tienda quedará en estado pendiente hasta completar la verificación.</li>
            <li>Podrás cargar logo, portada, contacto y rubros desde Información de Tienda.</li>
          </ul>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              disabled={loading}
              onClick={requestVerification}
              className={`px-6 py-3 rounded font-medium ${loading ? 'bg-gray-300 text-gray-600' : 'bg-black text-white hover:bg-gray-800'}`}
            >
              {loading ? 'Enviando…' : 'Solicitar verificación'}
            </button>
            <Link
              href="/dashboard"
              className="px-6 py-3 rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
            >
              Cancelar
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}


