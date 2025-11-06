'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import HeroImageUploader from '@/components/admin/HeroImageUploader';
import { heroPublicUrlFromPath } from '@/lib/storage/hero';

type Slide = {
  id?: string;
  title: string;
  subtitle?: string;
  description?: string;
  cta_primary_label?: string;
  cta_primary_href?: string;
  cta_secondary_label?: string;
  cta_secondary_href?: string;
  bg_type: 'gradient' | 'image';
  bg_gradient_from?: string;
  bg_gradient_to?: string;
  storage_path?: string;
  position: number;
  is_active: boolean;
  // Campos de banners
  banner_position?: 'hero'; // Solo Hero está soportado
  link_url?: string;
  start_date?: string;
  end_date?: string;
};

export default function AdminHeroPage() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Slide | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('📥 Cargando slides...');
      
      const { data, error } = await (supabase as any)
        .from('hero_slides')
        .select('*')
        .order('position', { ascending: true });
      
      if (error) {
        console.error('❌ Error cargando slides:', error);
        setError(error.message || 'Error al cargar los slides');
        setSlides([]);
        return;
      }
      
      console.log('✅ Slides cargados:', data?.length || 0);
      setSlides(data || []);
    } catch (err: any) {
      console.error('❌ Excepción cargando slides:', err);
      setError(err?.message || 'Error desconocido al cargar');
      setSlides([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createNew = async () => {
    const base: Slide = {
      title: 'Nuevo slide',
      subtitle: '',
      bg_type: 'gradient',
      bg_gradient_from: '#14B8A6',
      bg_gradient_to: '#06B6D4',
      position: slides.length,
      is_active: true,
      banner_position: 'hero',
    };
    setEditing(base);
  };

  const save = async () => {
    if (!editing) {
      console.warn('⚠️ No hay slide para guardar');
      return;
    }
    
    // Validación básica
    if (!editing.title || editing.title.trim() === '') {
      setError('El título es requerido');
      setSaving(false);
      return;
    }
    
    setSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      console.log('💾 Guardando slide:', editing);
      
      // Preparar datos para enviar (convertir strings vacíos a null)
      const dataToSave: any = {
        title: editing.title.trim(),
        subtitle: editing.subtitle?.trim() || null,
        description: editing.description?.trim() || null,
        cta_primary_label: editing.cta_primary_label?.trim() || null,
        cta_primary_href: editing.cta_primary_href?.trim() || null,
        cta_secondary_label: editing.cta_secondary_label?.trim() || null,
        cta_secondary_href: editing.cta_secondary_href?.trim() || null,
        bg_type: editing.bg_type,
        bg_gradient_from: editing.bg_gradient_from || null,
        bg_gradient_to: editing.bg_gradient_to || null,
        storage_path: editing.storage_path || null,
        position: editing.position,
        is_active: editing.is_active,
        banner_position: 'hero', // Siempre Hero - otras posiciones no están implementadas
        link_url: editing.link_url?.trim() || null,
        start_date: editing.start_date || null,
        end_date: editing.end_date || null,
      };
      
      console.log('📤 Datos a guardar:', JSON.stringify(dataToSave, null, 2));
      
      let result;
      if (editing.id) {
        console.log('📝 Actualizando slide existente:', editing.id);
        result = await (supabase as any)
          .from('hero_slides')
          .update(dataToSave)
          .eq('id', editing.id)
          .select('*')
          .single();
      } else {
        console.log('➕ Creando nuevo slide');
        result = await (supabase as any)
          .from('hero_slides')
          .insert(dataToSave)
          .select('*')
          .single();
      }
      
      console.log('📥 Respuesta de Supabase:', result);
      console.log('📥 result.data:', result.data);
      console.log('📥 result.data es array?:', Array.isArray(result.data));
      console.log('📥 result.data length:', result.data?.length);
      
      if (result.error) {
        console.error('❌ Error de Supabase:', result.error);
        console.error('❌ Código:', result.error.code);
        console.error('❌ Mensaje:', result.error.message);
        console.error('❌ Detalles:', result.error.details);
        setError(result.error.message || 'Error al guardar el slide');
        setSaving(false);
        return;
      }
      
      // Con .single(), result.data debería ser un objeto o null/undefined
      // Si es null/undefined pero no hay error, puede ser que RLS bloqueó el select
      if (!result.data) {
        if (editing.id) {
          // Para update, si no hay data pero no hay error, asumir que fue exitoso (RLS bloqueó el select)
          console.warn('⚠️ Update exitoso pero RLS puede haber bloqueado el select, recargando lista...');
          setSuccess('Slide actualizado correctamente');
          setEditing(null);
          await load();
          setTimeout(() => setSuccess(null), 3000);
          setSaving(false);
          return;
        } else {
          // Para creación, debe haber data
          console.error('⚠️ Supabase no retornó datos para creación');
          setError('No se recibieron datos del servidor. Verifica que tengas permisos de administrador.');
          setSaving(false);
          return;
        }
      }
      
      // result.data es un objeto con .single()
      console.log('✅ Slide guardado exitosamente:', result.data);
      
      setSuccess(editing.id ? 'Slide actualizado correctamente' : 'Slide creado correctamente');
      
      // Limpiar formulario
      setEditing(null);
      
      // Recargar lista para ver los cambios
      console.log('🔄 Recargando lista de slides...');
      await load();
      
      // Ocultar mensaje de éxito después de 3 segundos
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (err: any) {
      console.error('❌ Excepción al guardar:', err);
      console.error('❌ Stack:', err?.stack);
      setError(err?.message || 'Error desconocido al guardar');
    } finally {
      console.log('🏁 Finalizando save(), limpiando estado saving');
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este slide?')) return;
    setLoading(true);
    setError(null);
    try {
      console.log('🗑️ Eliminando slide:', id);
      const { error, data } = await (supabase as any)
        .from('hero_slides')
        .delete()
        .eq('id', id)
        .select();
      
      console.log('📥 Respuesta de eliminación:', { error, data });
      
      if (error) {
        console.error('❌ Error al eliminar:', error);
        setError(error.message || 'Error al eliminar el slide');
        setLoading(false);
      } else {
        console.log('✅ Slide eliminado exitosamente');
        setSuccess('Slide eliminado correctamente');
        await load();
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err: any) {
      console.error('❌ Excepción al eliminar:', err);
      setError(err.message || 'Error desconocido al eliminar');
      setLoading(false);
    }
  };


  // Reordenamiento simple: subir/bajar
  const move = async (index: number, direction: -1 | 1) => {
    const target = slides[index];
    const swap = slides[index + direction];
    if (!target || !swap) return;
    setLoading(true);
    await (supabase as any).from('hero_slides').update({ position: swap.position }).eq('id', target.id);
    await (supabase as any).from('hero_slides').update({ position: target.position }).eq('id', swap.id);
    await load();
  };

  const refreshStats = async () => {
    await fetch('/api/site-stats', { method: 'PATCH' });
  };

  return (
    <main className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Hero Editor</h1>
        <div className="flex gap-2">
          <button onClick={refreshStats} className="px-4 py-2 rounded bg-emerald-600 text-white">Refrescar estadísticas</button>
          <button onClick={createNew} className="px-4 py-2 rounded bg-black text-white">Nuevo slide</button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        </div>
      )}
      
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{success}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lista */}
        <div className="space-y-3">
          {slides.map((s, i) => (
            <div key={s.id} className="border rounded-lg p-3 flex items-center justify-between">
              <div>
                <div className="font-semibold">{s.title}</div>
                <div className="text-sm text-gray-500">{s.subtitle}</div>
                <div className="text-xs text-gray-400">
                  pos: {s.position} · {s.is_active ? 'activo' : 'inactivo'}
                  {s.start_date && ` · desde ${new Date(s.start_date).toLocaleDateString()}`}
                  {s.end_date && ` · hasta ${new Date(s.end_date).toLocaleDateString()}`}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => move(i, -1)} className="px-2 py-1 border rounded">↑</button>
                <button onClick={() => move(i, 1)} className="px-2 py-1 border rounded">↓</button>
                <button onClick={() => setEditing(s)} className="px-2 py-1 border rounded">Editar</button>
                {s.id && <button onClick={() => remove(s.id!)} className="px-2 py-1 border rounded text-red-600">Eliminar</button>}
              </div>
            </div>
          ))}
          {slides.length === 0 && (
            <div className="text-gray-500">No hay slides todavía.</div>
          )}
        </div>

        {/* Form */}
        <div className="border rounded-lg p-4">
          <h2 className="font-semibold mb-3">{editing?.id ? 'Editar slide' : 'Nuevo slide'}</h2>
          {!editing ? (
            <div className="text-gray-500">Selecciona un slide o crea uno nuevo.</div>
          ) : (
            <form 
              className="space-y-3" 
              onSubmit={async (e) => { 
                e.preventDefault(); 
                console.log('📝 Formulario enviado, llamando save()...');
                await save(); 
              }}
            >
              <div>
                <label className="text-sm">Título</label>
                <input className="w-full border rounded px-3 py-2" value={editing.title} onChange={(e)=>setEditing({ ...editing!, title: e.target.value })} />
              </div>
              <div>
                <label className="text-sm">Subtítulo</label>
                <input className="w-full border rounded px-3 py-2" value={editing.subtitle ?? ''} onChange={(e)=>setEditing({ ...editing!, subtitle: e.target.value })} />
              </div>
              <div>
                <label className="text-sm">Descripción (para banners)</label>
                <textarea className="w-full border rounded px-3 py-2" rows={2} value={editing.description ?? ''} onChange={(e)=>setEditing({ ...editing!, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm">CTA primaria (label)</label>
                  <input className="w-full border rounded px-3 py-2" value={editing.cta_primary_label ?? ''} onChange={(e)=>setEditing({ ...editing!, cta_primary_label: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm">CTA primaria (href)</label>
                  <input className="w-full border rounded px-3 py-2" value={editing.cta_primary_href ?? ''} onChange={(e)=>setEditing({ ...editing!, cta_primary_href: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm">CTA secundaria (label)</label>
                  <input className="w-full border rounded px-3 py-2" value={editing.cta_secondary_label ?? ''} onChange={(e)=>setEditing({ ...editing!, cta_secondary_label: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm">CTA secundaria (href)</label>
                  <input className="w-full border rounded px-3 py-2" value={editing.cta_secondary_href ?? ''} onChange={(e)=>setEditing({ ...editing!, cta_secondary_href: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Tipo de fondo</label>
                <select 
                  className="w-full border rounded px-3 py-2 mb-3" 
                  value={editing.bg_type} 
                  onChange={(e)=>setEditing({ ...editing!, bg_type: e.target.value as any })}
                >
                  <option value="gradient">🎨 Gradient (colores)</option>
                  <option value="image">🖼️ Imagen</option>
                </select>
              </div>
              
              {editing.bg_type === 'image' ? (
                <div>
                  <label className="text-sm font-medium mb-2 block">Imagen de fondo</label>
                  <HeroImageUploader
                    value={heroPublicUrlFromPath(editing.storage_path)}
                    onChange={(p)=>setEditing({ ...editing!, storage_path: p || undefined })}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm">Gradient from (color inicio)</label>
                    <input 
                      type="color"
                      className="w-full h-10 border rounded px-3 py-2 cursor-pointer" 
                      value={editing.bg_gradient_from ?? '#14B8A6'} 
                      onChange={(e)=>setEditing({ ...editing!, bg_gradient_from: e.target.value })} 
                    />
                    <input 
                      type="text"
                      className="w-full mt-1 border rounded px-3 py-2 text-sm" 
                      value={editing.bg_gradient_from ?? '#14B8A6'} 
                      onChange={(e)=>setEditing({ ...editing!, bg_gradient_from: e.target.value })} 
                      placeholder="#14B8A6"
                    />
                  </div>
                  <div>
                    <label className="text-sm">Gradient to (color fin)</label>
                    <input 
                      type="color"
                      className="w-full h-10 border rounded px-3 py-2 cursor-pointer" 
                      value={editing.bg_gradient_to ?? '#06B6D4'} 
                      onChange={(e)=>setEditing({ ...editing!, bg_gradient_to: e.target.value })} 
                    />
                    <input 
                      type="text"
                      className="w-full mt-1 border rounded px-3 py-2 text-sm" 
                      value={editing.bg_gradient_to ?? '#06B6D4'} 
                      onChange={(e)=>setEditing({ ...editing!, bg_gradient_to: e.target.value })} 
                      placeholder="#06B6D4"
                    />
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm">Posición (orden)</label>
                  <input type="number" className="w-full border rounded px-3 py-2" value={editing.position} onChange={(e)=>setEditing({ ...editing!, position: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="text-sm">Link URL (opcional)</label>
                  <input className="w-full border rounded px-3 py-2" type="url" value={editing.link_url ?? ''} onChange={(e)=>setEditing({ ...editing!, link_url: e.target.value })} placeholder="https://..." />
                </div>
                <div className="flex items-end gap-2">
                  <input id="is_active" type="checkbox" checked={editing.is_active} onChange={(e)=>setEditing({ ...editing!, is_active: e.target.checked })} />
                  <label htmlFor="is_active">Activo</label>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm">Fecha de inicio (opcional)</label>
                  <input className="w-full border rounded px-3 py-2" type="datetime-local" value={editing.start_date ? new Date(editing.start_date).toISOString().slice(0, 16) : ''} onChange={(e)=>setEditing({ ...editing!, start_date: e.target.value ? new Date(e.target.value).toISOString() : undefined })} />
                </div>
                <div>
                  <label className="text-sm">Fecha de fin (opcional)</label>
                  <input className="w-full border rounded px-3 py-2" type="datetime-local" value={editing.end_date ? new Date(editing.end_date).toISOString().slice(0, 16) : ''} onChange={(e)=>setEditing({ ...editing!, end_date: e.target.value ? new Date(e.target.value).toISOString() : undefined })} />
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  type="submit" 
                  disabled={saving}
                  className={`
                    px-4 py-2 rounded text-white transition-colors flex items-center gap-2
                    ${saving 
                      ? 'bg-emerald-400 cursor-not-allowed' 
                      : 'bg-emerald-600 hover:bg-emerald-700'
                    }
                  `}
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Guardando…</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Guardar</span>
                    </>
                  )}
                </button>
                <button 
                  type="button" 
                  disabled={saving}
                  className="px-4 py-2 rounded border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={()=>{
                    setEditing(null);
                    setError(null);
                    setSuccess(null);
                  }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}



