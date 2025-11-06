'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getAllBanners, createBanner, updateBanner, deleteBanner, type Banner } from '@/lib/services/bannerService';
import { uploadImage } from '@/lib/utils/imageUpload';

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image_url: '',
    link_url: '',
    position: 'hero' as 'hero' | 'sidebar' | 'footer' | 'top',
    is_active: true,
    start_date: '',
    end_date: '',
    sort_order: 0,
  });
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    loadBanners();
  }, []);

  async function loadBanners() {
    setLoading(true);
    try {
      const allBanners = await getAllBanners();
      setBanners(allBanners);
    } catch (error: any) {
      console.error('Error loading banners:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      // Subir a bucket 'banners' en la ruta 'banners'
      const url = await uploadImage(file, 'banners', 'banners');
      setFormData({ ...formData, image_url: url });
    } catch (error: any) {
      console.error('Error subiendo imagen:', error);
      alert(`Error subiendo imagen: ${error.message || 'Error desconocido'}`);
    } finally {
      setUploadingImage(false);
    }
  }

  function handleEdit(banner: Banner) {
    setEditingBanner(banner);
    setFormData({
      title: banner.title,
      description: banner.description || '',
      image_url: banner.image_url,
      link_url: banner.link_url || '',
      position: banner.position,
      is_active: banner.is_active,
      start_date: banner.start_date ? banner.start_date.split('T')[0] : '',
      end_date: banner.end_date ? banner.end_date.split('T')[0] : '',
      sort_order: banner.sort_order,
    });
    setShowForm(true);
  }

  function handleNew() {
    setEditingBanner(null);
    setFormData({
      title: '',
      description: '',
      image_url: '',
      link_url: '',
      position: 'hero',
      is_active: true,
      start_date: '',
      end_date: '',
      sort_order: 0,
    });
    setShowForm(true);
  }

  async function handleSave() {
    try {
      const bannerData = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        image_url: formData.image_url,
        link_url: formData.link_url.trim() || null,
        position: formData.position,
        is_active: formData.is_active,
        start_date: formData.start_date ? new Date(formData.start_date).toISOString() : null,
        end_date: formData.end_date ? new Date(formData.end_date + 'T23:59:59').toISOString() : null,
        sort_order: formData.sort_order,
      };

      if (editingBanner) {
        await updateBanner(editingBanner.id, bannerData);
        alert('✅ Banner actualizado');
      } else {
        await createBanner(bannerData);
        alert('✅ Banner creado');
      }

      setShowForm(false);
      setEditingBanner(null);
      await loadBanners();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este banner?')) return;

    try {
      await deleteBanner(id);
      alert('✅ Banner eliminado');
      await loadBanners();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  }

  if (loading && banners.length === 0) {
    return (
      <main className="min-h-screen bg-gray-50 p-4 sm:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando banners...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Gestión de Banners</h1>
            <p className="text-gray-600 mt-2">Crear y administrar banners promocionales</p>
          </div>
          <button
            onClick={handleNew}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Nuevo Banner</span>
          </button>
        </div>

        {/* Lista de banners */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {banners.map((banner) => (
            <div key={banner.id} className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <div className="relative h-48 bg-gray-100">
                {banner.image_url ? (
                  <img src={banner.image_url} alt={banner.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    Sin imagen
                  </div>
                )}
                {!banner.is_active && (
                  <div className="absolute top-2 right-2 px-2 py-1 bg-gray-800 bg-opacity-75 text-white text-xs rounded">
                    Inactivo
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 mb-1">{banner.title}</h3>
                {banner.description && (
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">{banner.description}</p>
                )}
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                    {banner.position}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs ${
                    banner.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {banner.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(banner)}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(banner.id)}
                    className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {banners.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm border p-8 text-center text-gray-500">
            No hay banners creados
          </div>
        )}

        {/* Modal de creación/edición */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">
                {editingBanner ? 'Editar Banner' : 'Nuevo Banner'}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Imagen</label>
                  {formData.image_url && (
                    <img src={formData.image_url} alt="Preview" className="mb-2 h-32 object-cover rounded" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  {uploadingImage && <p className="text-sm text-gray-500 mt-1">Subiendo...</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">URL de enlace (opcional)</label>
                  <input
                    type="url"
                    value={formData.link_url}
                    onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Posición</label>
                    <select
                      value={formData.position}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="hero">Hero (Carrusel)</option>
                      <option value="top">Top (Arriba)</option>
                      <option value="sidebar">Sidebar (Lateral)</option>
                      <option value="footer">Footer (Pie)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Orden</label>
                    <input
                      type="number"
                      value={formData.sort_order}
                      onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha inicio (opcional)</label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha fin (opcional)</label>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                    Activo
                  </label>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleSave}
                  disabled={!formData.title.trim() || !formData.image_url}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Guardar
                </button>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditingBanner(null);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

