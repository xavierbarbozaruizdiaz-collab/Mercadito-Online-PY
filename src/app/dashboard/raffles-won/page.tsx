'use client';

// ============================================
// MERCADITO ONLINE PY - SORTEOS GANADOS
// Página para ver sorteos ganados y subir fotos con premios
// ============================================

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Gift, Camera, Upload, X, Image as ImageIcon, ArrowLeft, CheckCircle, Plus } from 'lucide-react';
import { 
  getWonRaffles, 
  getRaffleWinnerPhotos, 
  uploadWinnerPhoto, 
  deleteWinnerPhoto,
  type Raffle,
  type RaffleWinnerPhoto 
} from '@/lib/services/raffleService';
import { supabase } from '@/lib/supabaseClient';
import { uploadImage } from '@/lib/utils/imageUpload';
import { useToast } from '@/lib/hooks/useToast';
import Image from 'next/image';

export default function RafflesWonPage() {
  const router = useRouter();
  const toast = useToast();
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [photoPreviews, setPhotoPreviews] = useState<Record<string, string>>({});
  const [captions, setCaptions] = useState<Record<string, string>>({});
  const [winnerPhotos, setWinnerPhotos] = useState<Record<string, RaffleWinnerPhoto[]>>({});

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        router.push('/auth/sign-in');
        return;
      }

      const userId = session.user.id;
      setCurrentUserId(userId);

      // Cargar sorteos ganados
      const wonRaffles = await getWonRaffles(userId);
      setRaffles(wonRaffles);

      // Cargar fotos para cada sorteo
      const photosMap: Record<string, RaffleWinnerPhoto[]> = {};
      for (const raffle of wonRaffles) {
        try {
          const photos = await getRaffleWinnerPhotos(raffle.id);
          photosMap[raffle.id] = photos;
        } catch (err) {
          console.warn(`Error loading photos for raffle ${raffle.id}:`, err);
          photosMap[raffle.id] = [];
        }
      }
      setWinnerPhotos(photosMap);

    } catch (err: any) {
      console.error('Error loading won raffles:', err);
      setError(err.message || 'Error al cargar sorteos ganados');
    } finally {
      setLoading(false);
    }
  }

  async function handleImageSelect(raffleId: string, file: File) {
    if (!currentUserId) {
      toast.error('Debes iniciar sesión');
      return;
    }

    try {
      setUploadingFor(raffleId);

      // Crear preview
      const preview = URL.createObjectURL(file);
      setPhotoPreviews(prev => ({ ...prev, [raffleId]: preview }));

      // Subir imagen a Supabase Storage
      const imageUrl = await uploadImage(
        file,
        'raffle-winner-photos',
        `${currentUserId}/${raffleId}`,
        {
          compress: true,
          maxSizeMB: 2,
          maxWidthOrHeight: 1920
        }
      );

      // Guardar en la base de datos (permitir múltiples fotos)
      const caption = captions[raffleId] || '';
      const photo = await uploadWinnerPhoto(raffleId, currentUserId, imageUrl, caption);

      // Actualizar estado con nueva foto
      setWinnerPhotos(prev => ({
        ...prev,
        [raffleId]: [photo, ...(prev[raffleId] || [])]
      }));

      // Limpiar preview y caption
      URL.revokeObjectURL(preview);
      setPhotoPreviews(prev => {
        const newPrev = { ...prev };
        delete newPrev[raffleId];
        return newPrev;
      });
      setCaptions(prev => {
        const newPrev = { ...prev };
        delete newPrev[raffleId];
        return newPrev;
      });

      toast.success('✅ Foto subida exitosamente');
    } catch (err: any) {
      console.error('Error uploading photo:', err);
      toast.error(`Error: ${err.message || 'Error al subir foto'}`);
      
      // Limpiar preview en caso de error
      const preview = photoPreviews[raffleId];
      if (preview) {
        URL.revokeObjectURL(preview);
        setPhotoPreviews(prev => {
          const newPrev = { ...prev };
          delete newPrev[raffleId];
          return newPrev;
        });
      }
    } finally {
      setUploadingFor(null);
    }
  }

  async function handleDeletePhoto(photoId: string, raffleId: string) {
    if (!currentUserId) return;

    if (!confirm('¿Eliminar esta foto?')) return;

    try {
      await deleteWinnerPhoto(photoId, currentUserId);

      // Actualizar estado
      setWinnerPhotos(prev => ({
        ...prev,
        [raffleId]: (prev[raffleId] || []).filter(p => p.id !== photoId)
      }));

      toast.success('✅ Foto eliminada');
    } catch (err: any) {
      console.error('Error deleting photo:', err);
      toast.error(`Error: ${err.message || 'Error al eliminar foto'}`);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-4 sm:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gray-50 p-4 sm:p-8">
        <div className="max-w-7xl mx-auto">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4">
            <ArrowLeft className="w-4 h-4" />
            Volver al dashboard
          </Link>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4">
            <ArrowLeft className="w-4 h-4" />
            Volver al dashboard
          </Link>
          <div className="flex items-center gap-3 mb-4">
            <Gift className="w-8 h-8 text-green-600" />
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Sorteos Ganados</h1>
          </div>
          <p className="text-gray-600">
            Comparte fotos de tus premios ganados en los sorteos
          </p>
        </div>

        {/* Lista de sorteos ganados */}
        {raffles.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Gift className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Aún no has ganado ningún sorteo</h2>
            <p className="text-gray-600 mb-4">
              ¡Sigue participando en los sorteos para tener la oportunidad de ganar!
            </p>
            <Link
              href="/raffles"
              className="inline-block px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Ver sorteos activos
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {raffles.map((raffle) => {
              const photos = winnerPhotos[raffle.id] || [];
              const hasPhoto = photos.length > 0;
              const preview = photoPreviews[raffle.id];

              return (
                <div
                  key={raffle.id}
                  className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden"
                >
                  <div className="p-6">
                    {/* Header del sorteo */}
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <h2 className="text-2xl font-bold text-gray-900">
                            {raffle.title}
                          </h2>
                        </div>
                        {raffle.product && (
                          <p className="text-lg text-gray-700 mb-2">
                            Premio: <strong>{raffle.product.title}</strong>
                          </p>
                        )}
                        {raffle.description && (
                          <p className="text-gray-600">{raffle.description}</p>
                        )}
                        <p className="text-sm text-gray-500 mt-2">
                          Sorteo realizado: {new Date(raffle.drawn_at || raffle.updated_at).toLocaleDateString('es-PY', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                      <Link
                        href={`/raffles/${raffle.id}`}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Ver sorteo →
                      </Link>
                    </div>

                    {/* Fotos existentes */}
                    {hasPhoto && (
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Tus fotos con el premio:</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {photos.map((photo) => (
                            <div key={photo.id} className="relative group">
                              <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                                <Image
                                  src={photo.image_url}
                                  alt={photo.caption || 'Foto del premio'}
                                  fill
                                  className="object-cover"
                                />
                                <button
                                  onClick={() => handleDeletePhoto(photo.id, raffle.id)}
                                  className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                              {photo.caption && (
                                <p className="mt-2 text-sm text-gray-600">{photo.caption}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Preview de foto nueva */}
                    {preview && (
                      <div className="mb-6">
                        <div className="relative aspect-square max-w-md rounded-lg overflow-hidden bg-gray-100">
                          <Image
                            src={preview}
                            alt="Preview"
                            fill
                            className="object-cover"
                          />
                        </div>
                      </div>
                    )}

                    {/* Subir foto */}
                    <div className="border-t border-gray-200 pt-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        {hasPhoto ? 'Agregar más fotos' : 'Subir foto con tu premio'}
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Descripción (opcional)
                          </label>
                          <textarea
                            value={captions[raffle.id] || ''}
                            onChange={(e) => setCaptions(prev => ({ ...prev, [raffle.id]: e.target.value }))}
                            placeholder="Ej: ¡Gracias por el sorteo! Estoy muy contento con mi premio..."
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            rows={3}
                          />
                        </div>
                        <label className="block">
                          <input
                            type="file"
                            accept="image/*"
                            id={`file-input-${raffle.id}`}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleImageSelect(raffle.id, file);
                                // Reset input para permitir subir la misma foto otra vez
                                e.target.value = '';
                              }
                            }}
                            className="hidden"
                            disabled={uploadingFor === raffle.id}
                          />
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => {
                                const input = document.getElementById(`file-input-${raffle.id}`) as HTMLInputElement;
                                input?.click();
                              }}
                              disabled={uploadingFor === raffle.id}
                              className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {uploadingFor === raffle.id ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                  Subiendo...
                                </>
                              ) : (
                                <>
                                  <Plus className="w-5 h-5" />
                                  {hasPhoto ? 'Agregar otra foto' : 'Subir foto'}
                                </>
                              )}
                            </button>
                            {preview && (
                              <button
                                type="button"
                                onClick={() => {
                                  URL.revokeObjectURL(preview);
                                  setPhotoPreviews(prev => {
                                    const newPrev = { ...prev };
                                    delete newPrev[raffle.id];
                                    return newPrev;
                                  });
                                  setCaptions(prev => {
                                    const newPrev = { ...prev };
                                    delete newPrev[raffle.id];
                                    return newPrev;
                                  });
                                }}
                                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                              >
                                Cancelar
                              </button>
                            )}
                          </div>
                        </label>
                        <p className="text-xs text-gray-500">
                          📸 Puedes subir múltiples fotos mostrando tu premio. Las imágenes serán comprimidas automáticamente.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

