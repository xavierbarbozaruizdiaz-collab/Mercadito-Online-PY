'use client';

// ============================================
// MERCADITO ONLINE PY - ADMIN - CREAR SORTEO
// ============================================

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Upload, X, Image as ImageIcon } from 'lucide-react';
import { createRaffle, type CreateRaffleData } from '@/lib/services/raffleService';
import { supabase } from '@/lib/supabaseClient';

export default function CreateRafflePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<CreateRaffleData & {
    cover_url?: string;
    allow_direct_purchase?: boolean;
    ticket_price?: number;
    raffle_type: 'purchase_based' | 'seller_raffle' | 'direct_purchase';
  }>({
    title: '',
    description: '',
    product_id: '',
    raffle_type: 'purchase_based',
    min_purchase_amount: 50000,
    tickets_per_amount: 100000,
    start_date: '',
    end_date: '',
    draw_date: '',
    allow_direct_purchase: false,
    ticket_price: 0,
  });

  const [imagePreviews, setImagePreviews] = useState<Array<{ file: File; preview: string }>>([]);
  const [coverImageUrl, setCoverImageUrl] = useState<string>('');

  useEffect(() => {
    checkAdmin();
  }, []);

  async function checkAdmin() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        router.push('/auth/sign-in');
        return;
      }

      const userId = session.user.id;
      setCurrentUserId(userId);

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (profile?.role !== 'admin') {
        router.push('/');
        return;
      }
    } catch (err) {
      console.error('Error checking admin:', err);
      router.push('/');
    }
  }

  async function uploadImage(file: File): Promise<string> {
    const fileName = `raffles/${Date.now()}-${Math.random().toString(36).substring(7)}-${file.name}`;
    const { error } = await supabase.storage.from('product-images').upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    });
    if (error) throw error;
    const { data: pub } = supabase.storage.from('product-images').getPublicUrl(fileName);
    return pub.publicUrl;
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;

    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(f => {
      const ext = f.name.split('.').pop()?.toLowerCase();
      return ['jpg', 'jpeg', 'png', 'webp'].includes(ext || '') && f.size <= 5 * 1024 * 1024;
    });

    if (validFiles.length === 0) {
      alert('Solo se permiten imágenes JPG, PNG o WEBP (máx 5MB)');
      return;
    }

    const newPreviews = validFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }));

    setImagePreviews([...imagePreviews, ...newPreviews].slice(0, 5));
  }

  function removeImage(index: number) {
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    setImagePreviews(newPreviews);
    if (index === 0 && newPreviews.length > 0) {
      setCoverImageUrl(newPreviews[0].preview);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUserId) return;

    // Validaciones
    if (!formData.title.trim()) {
      alert('El título es obligatorio');
      return;
    }
    if (!formData.start_date || !formData.end_date || !formData.draw_date) {
      alert('Debes completar todas las fechas');
      return;
    }

    const start = new Date(formData.start_date);
    const end = new Date(formData.end_date);
    const draw = new Date(formData.draw_date);

    if (start >= end || end >= draw) {
      alert('Las fechas deben ser válidas: inicio < fin < sorteo');
      return;
    }

    // Validar según tipo
    if (formData.raffle_type === 'direct_purchase') {
      if (!formData.allow_direct_purchase || !formData.ticket_price || formData.ticket_price <= 0) {
        alert('Debes configurar el precio de los cupones para compra directa');
        return;
      }
    }

    if (formData.raffle_type === 'purchase_based') {
      if (!formData.tickets_per_amount || formData.tickets_per_amount <= 0) {
        alert('Debes configurar el monto por ticket');
        return;
      }
    }

    try {
      setLoading(true);

      // Subir imagen principal si hay
      let coverUrl = formData.cover_url || '';
      if (imagePreviews.length > 0) {
        coverUrl = await uploadImage(imagePreviews[0].file);
      }

      // Preparar datos
      const raffleData: any = {
        title: formData.title,
        description: formData.description || undefined,
        product_id: formData.product_id || undefined,
        raffle_type: formData.raffle_type,
        min_purchase_amount: formData.min_purchase_amount || 0,
        tickets_per_amount: formData.tickets_per_amount || 100000,
        start_date: formData.start_date,
        end_date: formData.end_date,
        draw_date: formData.draw_date,
        seller_id: currentUserId,
        cover_url: coverUrl || undefined,
        allow_direct_purchase: formData.allow_direct_purchase || false,
        ticket_price: formData.ticket_price || undefined,
        status: 'active',
        is_enabled: true,
        admin_approved: true,
        admin_approved_at: new Date().toISOString(),
        admin_approved_by: currentUserId,
      };

      // Crear sorteo
      const { data, error } = await supabase
        .from('raffles')
        .insert(raffleData)
        .select()
        .single();

      if (error) throw error;

      // Subir imágenes adicionales si hay
      if (imagePreviews.length > 1) {
        const raffleId = data.id;
        for (let i = 1; i < imagePreviews.length; i++) {
          const imageUrl = await uploadImage(imagePreviews[i].file);
          await supabase.from('raffle_images').insert({
            raffle_id: raffleId,
            url: imageUrl,
            idx: i,
          });
        }
      }

      alert('✅ Sorteo creado exitosamente');
      router.push('/admin/raffles');
    } catch (err: any) {
      console.error('Error creating raffle:', err);
      alert(`Error: ${err.message || 'Error al crear sorteo'}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/admin/raffles"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a sorteos
        </Link>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Crear Nuevo Sorteo</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Título */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Título del sorteo *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              />
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descripción
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                rows={3}
              />
            </div>

            {/* Tipo de sorteo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de sorteo *
              </label>
              <select
                value={formData.raffle_type}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  raffle_type: e.target.value as any,
                  allow_direct_purchase: e.target.value === 'direct_purchase'
                })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              >
                <option value="purchase_based">Por compras (ganar tickets automáticamente)</option>
                <option value="direct_purchase">Compra directa de cupones</option>
                <option value="seller_raffle">Sorteo de vendedor</option>
              </select>
            </div>

            {/* Producto ID (opcional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ID del Producto (opcional)
              </label>
              <input
                type="text"
                value={formData.product_id}
                onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Deja vacío si no hay producto específico"
              />
              <p className="text-xs text-gray-500 mt-1">
                Si no hay producto, puedes subir imágenes del sorteo a continuación
              </p>
            </div>

            {/* Imágenes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Imágenes del sorteo
              </label>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 cursor-pointer">
                    <Upload className="w-4 h-4" />
                    Subir imágenes
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                  </label>
                  <p className="text-sm text-gray-600">
                    Primera imagen será la portada (máx 5 imágenes, 5MB cada una)
                  </p>
                </div>

                {imagePreviews.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={preview.preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg border border-gray-300"
                        />
                        {index === 0 && (
                          <span className="absolute top-2 left-2 bg-purple-600 text-white text-xs px-2 py-1 rounded">
                            Portada
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Configuración según tipo */}
            {formData.raffle_type === 'purchase_based' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Monto mínimo de compra (Gs.)
                    </label>
                    <input
                      type="number"
                      value={formData.min_purchase_amount}
                      onChange={(e) => setFormData({ ...formData, min_purchase_amount: Number(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Monto por ticket (Gs.)
                    </label>
                    <input
                      type="number"
                      value={formData.tickets_per_amount}
                      onChange={(e) => setFormData({ ...formData, tickets_per_amount: Number(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      min="1"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Ej: 100000 = 1 ticket por cada 100,000 Gs.
                    </p>
                  </div>
                </div>
              </>
            )}

            {formData.raffle_type === 'direct_purchase' && (
              <div>
                <label className="flex items-center gap-2 mb-4">
                  <input
                    type="checkbox"
                    checked={formData.allow_direct_purchase}
                    onChange={(e) => setFormData({ ...formData, allow_direct_purchase: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Permitir compra directa de cupones
                  </span>
                </label>
                {formData.allow_direct_purchase && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Precio por cupón (Gs.) *
                    </label>
                    <input
                      type="number"
                      value={formData.ticket_price || ''}
                      onChange={(e) => setFormData({ ...formData, ticket_price: Number(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      min="1"
                      required={formData.allow_direct_purchase}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Fechas */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha de inicio *
                </label>
                <input
                  type="datetime-local"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha de fin *
                </label>
                <input
                  type="datetime-local"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha de sorteo *
                </label>
                <input
                  type="datetime-local"
                  value={formData.draw_date}
                  onChange={(e) => setFormData({ ...formData, draw_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
            </div>

            {/* Botones */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Creando...' : 'Crear Sorteo'}
              </button>
              <Link
                href="/admin/raffles"
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </Link>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}

