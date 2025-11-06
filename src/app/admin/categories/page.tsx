'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

type Category = { id: number; name: string; created_at: string };

export default function AdminCategories() {
  const [cats, setCats] = useState<Category[]>([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function load() {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name, created_at')
      .order('name', { ascending: true });
    if (!error && data) setCats(data);
  }

  useEffect(() => { load(); }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setMsg(null);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess?.session?.user?.id ?? null;
      const { error } = await supabase.from('categories').insert({
        name: name.trim(),
        created_by: uid,
      });
      if (error) throw error;
      setName('');
      await load();
      setMsg({ type: 'success', text: 'Categoría creada correctamente' });
    } catch (e: any) {
      setMsg({ type: 'error', text: e?.message ?? 'Error al crear categoría' });
    } finally {
      setLoading(false);
    }
  }

  async function del(id: number) {
    if (!confirm('¿Eliminar esta categoría?')) return;
    setLoading(true);
    setMsg(null);
    try {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
      await load();
      setMsg({ type: 'success', text: 'Categoría eliminada correctamente' });
    } catch (e: any) {
      setMsg({ type: 'error', text: e?.message ?? 'Error al eliminar categoría' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Gestionar Categorías</h1>
                <p className="text-gray-600 mt-1">Crea y administra las categorías de productos</p>
              </div>
            </div>
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Volver al panel
            </Link>
          </div>
        </div>

        {/* Mensaje */}
        {msg && (
          <div className={`mb-6 p-4 rounded-xl border-2 flex items-start gap-3 ${
            msg.type === 'success' 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <div className={`flex-shrink-0 ${msg.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
              {msg.type === 'success' ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>
            <p className="font-medium flex-1">{msg.text}</p>
          </div>
        )}

        {/* Formulario de creación */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 sm:p-8 mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">Crear Nueva Categoría</h2>
          <form onSubmit={add} className="flex flex-col sm:flex-row gap-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Calzado, Ropa, Electrónica..."
              className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-200 transition-all"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Guardando…
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Crear
                </>
              )}
            </button>
          </form>
        </div>

        {/* Lista de categorías */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
              Categorías existentes ({cats.length})
            </h2>
          </div>
          {cats.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <p className="text-gray-500 font-medium">No hay categorías aún</p>
              <p className="text-gray-400 text-sm mt-1">Crea tu primera categoría arriba</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {cats.map((c, idx) => (
                <li key={c.id} className="flex items-center justify-between p-4 sm:p-6 hover:bg-gray-50 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-purple-600 font-bold">{idx + 1}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-900 text-lg">{c.name}</span>
                      <p className="text-sm text-gray-500 mt-1">
                        Creada el {new Date(c.created_at).toLocaleDateString('es-PY')}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => del(c.id)}
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium disabled:opacity-50"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Eliminar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
