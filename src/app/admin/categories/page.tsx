'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Category = { id: string; name: string; slug?: string; is_active?: boolean; created_at: string };

export default function AdminCategories() {
  const [cats, setCats] = useState<Category[]>([]);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function load() {
    try {
      console.log('📦 Cargando categorías...');
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, slug, is_active, created_at')
        .order('name', { ascending: true });
      
      if (error) {
        console.error('❌ Error cargando categorías:', error);
        showMsg('error', `❌ Error: ${error.message || 'No se pudieron cargar las categorías'}`);
        setCats([]);
        return;
      }
      
      console.log('✅ Categorías cargadas:', data?.length || 0);
      setCats(data as Category[] || []);
    } catch (e: any) {
      console.error('❌ Excepción al cargar categorías:', e);
      showMsg('error', `❌ Error: ${e?.message || 'Error desconocido'}`);
      setCats([]);
    }
  }

  useEffect(() => { load(); }, []);

  function showMsg(type: 'success' | 'error', text: string) {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 5000);
  }

  async function add() {
    if (!name.trim()) {
      showMsg('error', 'El nombre es requerido');
      return;
    }
    
    const trimmedName = name.trim();
    
    // Verificar si ya existe una categoría con ese nombre
    const exists = cats.find(c => c.name.toLowerCase() === trimmedName.toLowerCase());
    if (exists) {
      showMsg('error', `❌ Ya existe una categoría con el nombre "${trimmedName}"`);
      return;
    }
    
    setLoading(true);
    setMsg(null);
    try {
      let slug = trimmedName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      
      // Verificar si el slug ya existe y generar uno único
      let finalSlug = slug;
      let counter = 1;
      while (cats.some(c => c.slug === finalSlug)) {
        finalSlug = `${slug}-${counter}`;
        counter++;
      }
      
      const { data, error } = await (supabase as any).from('categories').insert({
        name: trimmedName,
        slug: finalSlug,
        is_active: true,
        sort_order: 0,
      }).select();
      
      if (error) {
        console.error('Error creando categoría:', error);
        if (error.code === '23505') { // Unique violation
          showMsg('error', `❌ Ya existe una categoría con ese nombre o slug`);
        } else if (error.code === '409') {
          showMsg('error', `❌ Conflicto: La categoría ya existe`);
        } else {
          showMsg('error', `❌ Error: ${error.message || 'No se pudo crear la categoría'}`);
        }
        return;
      }
      
      setName('');
      await load();
      showMsg('success', '✅ Categoría creada');
    } catch (e: any) {
      console.error('Excepción creando categoría:', e);
      showMsg('error', `❌ Error: ${e?.message || 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  }

  function startEdit(cat: Category) {
    setEditingId(cat.id);
    setEditingName(cat.name);
  }

  async function saveEdit() {
    if (!editingId || !editingName.trim()) {
      showMsg('error', 'El nombre es requerido');
      return;
    }

    const trimmedName = editingName.trim();
    const currentCat = cats.find(c => c.id === editingId);
    
    // Verificar si el nuevo nombre ya existe en otra categoría
    const exists = cats.find(c => 
      c.id !== editingId && 
      c.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (exists) {
      showMsg('error', `❌ Ya existe otra categoría con el nombre "${trimmedName}"`);
      return;
    }

    setLoading(true);
    setMsg(null);
    try {
      let slug = trimmedName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();

      // Verificar si el slug ya existe en otra categoría
      let finalSlug = slug;
      let counter = 1;
      while (cats.some(c => c.id !== editingId && c.slug === finalSlug)) {
        finalSlug = `${slug}-${counter}`;
        counter++;
      }

      const { error } = await (supabase as any)
        .from('categories')
        .update({ name: trimmedName, slug: finalSlug })
        .eq('id', editingId);

      if (error) {
        console.error('Error actualizando categoría:', error);
        if (error.code === '23505') { // Unique violation
          showMsg('error', `❌ Ya existe otra categoría con ese nombre o slug`);
        } else if (error.code === '409') {
          showMsg('error', `❌ Conflicto: La categoría ya existe`);
        } else {
          showMsg('error', `❌ Error: ${error.message || 'No se pudo actualizar la categoría'}`);
        }
        return;
      }
      
      setEditingId(null);
      setEditingName('');
      await load();
      showMsg('success', '✅ Categoría actualizada');
    } catch (e: any) {
      console.error('Excepción actualizando categoría:', e);
      showMsg('error', `❌ Error: ${e?.message || 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingName('');
  }

  async function toggleActive(id: string, currentStatus: boolean) {
    setLoading(true);
    setMsg(null);
    try {
      const { error } = await (supabase as any)
        .from('categories')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      await load();
      showMsg('success', `✅ Categoría ${!currentStatus ? 'activada' : 'desactivada'}`);
    } catch (e: any) {
      showMsg('error', '❌ ' + (e?.message ?? 'Error'));
    } finally {
      setLoading(false);
    }
  }

  async function del(id: string) {
    const cat = cats.find(c => c.id === id);
    if (!cat) return;
    
    if (!confirm(`¿Eliminar la categoría "${cat.name}"? Esto puede afectar productos asociados.`)) return;
    
    setLoading(true);
    setMsg(null);
    try {
      console.log('🗑️ Eliminando categoría:', id, cat.name);
      const { data, error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id)
        .select();
      
      if (error) {
        console.error('Error eliminando categoría:', error);
        if (error.code === '23503') { // Foreign key violation
          showMsg('error', `❌ No se puede eliminar: Hay productos asociados a esta categoría`);
        } else {
          showMsg('error', `❌ Error: ${error.message || 'No se pudo eliminar la categoría'}`);
        }
        return;
      }
      
      console.log('✅ Categoría eliminada:', data);
      await load();
      showMsg('success', `✅ Categoría "${cat.name}" eliminada`);
    } catch (e: any) {
      console.error('Excepción eliminando categoría:', e);
      showMsg('error', `❌ Error: ${e?.message || 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Gestión de Categorías</h1>
          <p className="text-gray-600 mt-2">Crear, editar y administrar categorías de productos</p>
        </div>

        {msg && (
          <div className={`mb-4 p-4 rounded-lg ${
            msg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {msg.text}
          </div>
        )}

        {/* Formulario de creación */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Nueva Categoría</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !loading && add()}
              placeholder="Ej: Calzado, Ropa, Electrónica..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={add}
              disabled={loading || !name.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Guardando…</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Crear</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Lista de categorías */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="p-4 border-b bg-gray-50">
            <h2 className="text-lg font-semibold">Categorías ({cats.length})</h2>
          </div>
          <div className="divide-y">
            {cats.length === 0 ? (
              <div className="p-6 text-center text-gray-500">No hay categorías creadas</div>
            ) : (
              cats.map((c) => (
                <div key={c.id} className="p-4 hover:bg-gray-50 transition-colors">
                  {editingId === c.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && saveEdit()}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                      <button
                        onClick={saveEdit}
                        disabled={loading}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                      >
                        Guardar
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleActive(c.id, c.is_active ?? true)}
                          disabled={loading}
                          className={`px-3 py-1 rounded text-xs font-medium disabled:opacity-50 ${
                            c.is_active !== false
                              ? 'bg-green-100 text-green-800 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                          }`}
                          title={c.is_active !== false ? 'Activa - Click para desactivar' : 'Inactiva - Click para activar'}
                        >
                          {c.is_active !== false ? '✓ Activa' : '✗ Inactiva'}
                        </button>
                        <span className="font-medium text-gray-900">{c.name}</span>
                        {c.slug && (
                          <span className="text-xs text-gray-500">({c.slug})</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => startEdit(c)}
                          className="px-3 py-1 text-blue-600 hover:text-blue-800 text-sm"
                          title="Editar"
                        >
                          ✎
                        </button>
                        <button
                          onClick={() => del(c.id)}
                          disabled={loading}
                          className="px-3 py-1 text-red-600 hover:text-red-800 text-sm disabled:opacity-50"
                          title="Eliminar"
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
