'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getAllPages, createPage, updatePage, deletePage, type StaticPage } from '@/lib/services/staticPagesService';

export default function AdminPagesPage() {
  const [pages, setPages] = useState<StaticPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPage, setEditingPage] = useState<StaticPage | null>(null);
  const [formData, setFormData] = useState({
    slug: '',
    title: '',
    content: '',
    meta_description: '',
    is_published: true,
  });

  useEffect(() => {
    loadPages();
  }, []);

  async function loadPages() {
    setLoading(true);
    try {
      const allPages = await getAllPages(true); // Incluir no publicadas
      setPages(allPages);
    } catch (error: any) {
      console.error('Error loading pages:', error);
    } finally {
      setLoading(false);
    }
  }

  function generateSlug(title: string): string {
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  function handleEdit(page: StaticPage) {
    setEditingPage(page);
    setFormData({
      slug: page.slug,
      title: page.title,
      content: page.content,
      meta_description: page.meta_description || '',
      is_published: page.is_published,
    });
    setShowForm(true);
  }

  function handleNew() {
    setEditingPage(null);
    setFormData({
      slug: '',
      title: '',
      content: '',
      meta_description: '',
      is_published: true,
    });
    setShowForm(true);
  }

  async function handleSave() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No autenticado');

      const slug = formData.slug.trim() || generateSlug(formData.title);

      if (editingPage) {
        await updatePage(
          editingPage.id,
          {
            slug,
            title: formData.title.trim(),
            content: formData.content.trim(),
            meta_description: formData.meta_description.trim() || null,
            is_published: formData.is_published,
          },
          user.id
        );
        alert('✅ Página actualizada');
      } else {
        await createPage(
          slug,
          formData.title.trim(),
          formData.content.trim(),
          formData.meta_description.trim() || null,
          formData.is_published,
          user.id
        );
        alert('✅ Página creada');
      }

      setShowForm(false);
      setEditingPage(null);
      await loadPages();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta página? Esta acción no se puede deshacer.')) return;

    try {
      await deletePage(id);
      alert('✅ Página eliminada');
      await loadPages();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  }

  async function togglePublish(page: StaticPage) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No autenticado');

      await updatePage(
        page.id,
        { is_published: !page.is_published },
        user.id
      );
      await loadPages();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  }

  if (loading && pages.length === 0) {
    return (
      <main className="min-h-screen bg-gray-50 p-4 sm:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando páginas...</p>
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
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Páginas Estáticas</h1>
            <p className="text-gray-600 mt-2">Gestionar términos, condiciones y otras páginas</p>
          </div>
          <button
            onClick={handleNew}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Nueva Página</span>
          </button>
        </div>

        {/* Lista de páginas */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Slug</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Título</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actualizada</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pages.map((page) => (
                  <tr key={page.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">
                      /{page.slug}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{page.title}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => togglePublish(page)}
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          page.is_published
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        }`}
                      >
                        {page.is_published ? '✓ Publicada' : '✗ Borrador'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(page.updated_at).toLocaleDateString('es-PY')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleEdit(page)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Editar
                      </button>
                      <a
                        href={`/pages/${page.slug}`}
                        target="_blank"
                        className="text-green-600 hover:text-green-900"
                      >
                        Ver
                      </a>
                      <button
                        onClick={() => handleDelete(page.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pages.length === 0 && (
            <div className="p-8 text-center text-gray-500">No hay páginas creadas</div>
          )}
        </div>

        {/* Modal de creación/edición */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">
                {editingPage ? 'Editar Página' : 'Nueva Página'}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Slug (URL)</label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="terminos-y-condiciones"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Se generará automáticamente desde el título si está vacío</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Términos y Condiciones"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Meta Descripción</label>
                  <input
                    type="text"
                    value={formData.meta_description}
                    onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })}
                    placeholder="Descripción breve para SEO"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contenido (Markdown o HTML)</label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    rows={15}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    placeholder="Escribe el contenido aquí..."
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_published"
                    checked={formData.is_published}
                    onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="is_published" className="text-sm font-medium text-gray-700">
                    Publicar inmediatamente
                  </label>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleSave}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Guardar
                </button>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditingPage(null);
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

