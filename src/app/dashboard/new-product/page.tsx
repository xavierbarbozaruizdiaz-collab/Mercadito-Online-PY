'use client';

import { useEffect, useMemo, useState } from 'react';
import imageCompression from 'browser-image-compression';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

type Category = { id: number; name: string };

export default function NewProduct() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<string>('');
  const [saleType, setSaleType] = useState<'direct' | 'auction'>('direct');
  const [condition, setCondition] = useState<'nuevo' | 'usado' | 'usado_como_nuevo'>('nuevo');
  const [categoryId, setCategoryId] = useState<number | null>(null);

  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string>('');

  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .order('name', { ascending: true });
      if (!error && data) setCategories(data);
    })();
  }, []);

  const priceNumber = useMemo(() => Number(price || 0), [price]);

  async function compress(file: File) {
    const opts = { maxSizeMB: 0.4, maxWidthOrHeight: 1600, useWebWorker: true };
    try {
      const out = await imageCompression(file, opts);
      return out;
    } catch {
      return file; // si falla, subimos el original
    }
  }

  async function uploadToBucket(f: File, productId: number, idx: number) {
    const ext = f.name.split('.').pop() || 'jpg';
    const fileName = `products/${productId}/${idx}.${ext}`;
    const { error } = await supabase.storage.from('product-images').upload(fileName, f, {
      cacheControl: '3600',
      upsert: false,
    });
    if (error) throw error;
    const { data: pub } = supabase.storage.from('product-images').getPublicUrl(fileName);
    return pub.publicUrl;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    setLoading(true);

    try {
      // validar
      if (!title.trim()) throw new Error('Título requerido');
      if (!priceNumber || priceNumber <= 0) throw new Error('Precio inválido');
      if (!categoryId) throw new Error('Selecciona una categoría');
      if (files.length === 0) throw new Error('Agrega al menos una imagen');

      // quién crea
      const { data: session } = await supabase.auth.getSession();
      const created_by = session?.session?.user?.id ?? null;

      // 1. Insertar producto primero para obtener ID
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        price: priceNumber,
        sale_type: saleType,
        condition, // 'nuevo' | 'usado' | 'usado_como_nuevo'
        category_id: categoryId,
        created_by,
      };

      const { data: newProduct, error: insertError } = await supabase
        .from('products')
        .insert(payload)
        .select('id')
        .single();
      
      if (insertError || !newProduct) throw insertError;

      // 2. Comprimir imágenes (máx 10)
      const selected = files.slice(0, 10);
      const compressed = await Promise.all(selected.map(compress));

      // 3. Subir imágenes y guardar en product_images
      const imageUrls = await Promise.all(
        compressed.map((f, idx) => uploadToBucket(f, newProduct.id, idx))
      );

      // 4. Insertar registros en product_images
      const imageRecords = imageUrls.map((url, idx) => ({
        product_id: newProduct.id,
        url,
        idx,
      }));

      const { error: imagesError } = await supabase
        .from('product_images')
        .insert(imageRecords);
      
      if (imagesError) throw imagesError;

      // 5. Actualizar cover_url del producto
      const { error: updateError } = await supabase
        .from('products')
        .update({ cover_url: imageUrls[0] })
        .eq('id', newProduct.id);
      
      if (updateError) throw updateError;

      setMsg('✅ Producto agregado correctamente');
      // reset
      setTitle(''); setDescription(''); setPrice(''); setFiles([]);
      setSaleType('direct'); setCondition('nuevo'); setCategoryId(null);
    } catch (err: any) {
      setMsg('❌ ' + (err?.message ?? 'Error al guardar'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Nuevo producto</h1>
        <Link href="/" className="underline text-sm">← Volver</Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-3xl">
        <input
          type="text"
          placeholder="Ej: Zapatillas deportivas"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="border p-2 w-full rounded"
          required
        />

        <textarea
          placeholder="Detalles del producto…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="border p-2 w-full rounded min-h-[140px]"
        />

        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm mb-1">Precio (Gs.)</label>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="border p-2 w-full rounded"
              required
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Tipo de venta</label>
            <div className="flex gap-2">
              <button type="button"
                className={`px-3 py-2 border rounded ${saleType==='direct'?'bg-black text-white':''}`}
                onClick={() => setSaleType('direct')}>Directa</button>
              <button type="button"
                className={`px-3 py-2 border rounded ${saleType==='auction'?'bg-black text-white':''}`}
                onClick={() => setSaleType('auction')}>Subasta</button>
            </div>
          </div>

          <div>
            <label className="block text-sm mb-1">Condición</label>
            <select
              className="border p-2 w-full rounded"
              value={condition}
              onChange={(e) => setCondition(e.target.value as any)}
              required
            >
              <option value="nuevo">Nuevo</option>
              <option value="usado_como_nuevo">Usado como nuevo</option>
              <option value="usado">Usado</option>
            </select>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 items-end">
          <div>
            <label className="block text-sm mb-1">Categoría</label>
            <select
              className="border p-2 w-full rounded"
              value={categoryId ?? ''}
              onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">— Sin categoría —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm mb-1">
            Imágenes (máx. 10) — la primera será la portada
          </label>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            className="border p-2 w-full rounded"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="bg-black text-white px-4 py-2 rounded"
        >
          {loading ? 'Subiendo…' : 'Agregar producto'}
        </button>

        {msg && <p className="text-sm mt-2">{msg}</p>}
      </form>
    </main>
  );
}
