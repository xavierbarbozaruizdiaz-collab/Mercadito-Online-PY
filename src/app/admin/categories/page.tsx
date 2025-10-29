'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Category = { id: number; name: string; created_at: string };

export default function AdminCategories() {
  const [cats, setCats] = useState<Category[]>([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  async function load() {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name, created_at')
      .order('name', { ascending: true });
    if (!error && data) setCats(data);
  }

  useEffect(() => { load(); }, []);

  async function add() {
    if (!name.trim()) return;
    setLoading(true); setMsg('');
    try {
      // Generar slug desde el nombre (convertir a minúsculas, espacios a guiones)
      const slug = name.trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remover acentos
        .replace(/[^a-z0-9\s-]/g, '') // Remover caracteres especiales
        .replace(/\s+/g, '-') // Espacios a guiones
        .replace(/-+/g, '-') // Múltiples guiones a uno solo
        .trim();
      
      const { error } = await (supabase as any).from('categories').insert({
        name: name.trim(),
        slug: slug,
        is_active: true,
        sort_order: 0,
      } as any);
      if (error) throw error;
      setName('');
      await load();
      setMsg('✅ Categoría creada');
    } catch (e: any) {
      setMsg('❌ ' + (e?.message ?? 'Error'));
    } finally {
      setLoading(false);
    }
  }

  async function del(id: number) {
    if (!confirm('¿Eliminar esta categoría?')) return;
    setLoading(true); setMsg('');
    try {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
      await load();
      setMsg('✅ Categoría eliminada');
    } catch (e: any) {
      setMsg('❌ ' + (e?.message ?? 'Error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">Categorías</h1>

      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej: Calzado"
          className="border p-2 rounded w-full"
        />
        <button onClick={add} disabled={loading} className="bg-black text-white px-4 py-2 rounded">
          {loading ? 'Guardando…' : 'Crear'}
        </button>
      </div>

      {msg && <p className="text-sm">{msg}</p>}

      <ul className="divide-y bg-white border rounded">
        {cats.map(c => (
          <li key={c.id} className="flex items-center justify-between p-3">
            <span>{c.name}</span>
            <button onClick={() => del(c.id)} className="text-red-600 underline">
              Eliminar
            </button>
          </li>
        ))}
        {cats.length === 0 && <li className="p-3 text-gray-500">Sin categorías</li>}
      </ul>
    </div>
  );
}
