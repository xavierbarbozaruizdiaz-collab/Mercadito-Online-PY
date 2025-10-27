'use client';

import { useEffect, useMemo, useState } from 'react';
import imageCompression from 'browser-image-compression';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

const MAX_IMAGES = 10;

type Category = { id: string; name: string };
type ImagePreview = { file: File; preview: string };

export default function NewProduct() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<string>('');
  const [saleType, setSaleType] = useState<'direct' | 'auction'>('direct');
  const [condition, setCondition] = useState<'nuevo' | 'usado' | 'usado_como_nuevo'>('nuevo');
  const [categoryId, setCategoryId] = useState<string | null>(null);

  const [imagePreviews, setImagePreviews] = useState<ImagePreview[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
  const imagesCount = imagePreviews.length;

  // Manejar selección de archivos
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const validFiles = files.filter(f => {
      const ext = f.name.split('.').pop()?.toLowerCase();
      return ['jpg', 'jpeg', 'png', 'webp'].includes(ext || '');
    });

    if (validFiles.length === 0 && files.length > 0) {
      showMsg('error', 'Solo se permiten imágenes JPG, PNG o WEBP');
      return;
    }

    // Limitar a MAX_IMAGES
    const remaining = MAX_IMAGES - imagePreviews.length;
    const toAdd = validFiles.slice(0, remaining);

    if (validFiles.length > remaining) {
      showMsg('error', `Solo puedes agregar ${remaining} imagen(es) más`);
    }

    const newPreviews = toAdd.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }));

    setImagePreviews(prev => [...prev, ...newPreviews]);
  }

  // Eliminar imagen de preview
  function removeImage(idx: number) {
    setImagePreviews(prev => {
      const newPreviews = [...prev];
      newPreviews[idx] && URL.revokeObjectURL(newPreviews[idx].preview);
      return newPreviews.filter((_, i) => i !== idx);
    });
  }

  // Mostrar mensaje temporal
  function showMsg(type: 'success' | 'error', text: string) {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 5000);
  }

  async function compress(file: File) {
    const opts = { maxSizeMB: 0.4, maxWidthOrHeight: 1600, useWebWorker: true };
    try {
      return await imageCompression(file, opts);
    } catch {
      return file;
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
    setMsg(null);
    setLoading(true);

    try {
      // Validar
      if (!title.trim()) throw new Error('Título requerido');
      if (!priceNumber || priceNumber <= 0) throw new Error('Precio inválido');
      if (!categoryId) throw new Error('Selecciona una categoría');
      if (imagePreviews.length === 0) throw new Error('Agrega al menos una imagen');

      // Obtener usuario actual
      const { data: session } = await supabase.auth.getSession();
      const created_by = session?.session?.user?.id ?? null;

      // 1. Insertar producto
      const { data: newProduct, error: insertError } = await supabase
        .from('products')
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          price: priceNumber,
          sale_type: saleType,
          condition,
          category_id: categoryId,
          created_by,
        })
        .select('id')
        .single();

      if (insertError || !newProduct) throw insertError;

      // 2. Comprimir imágenes
      const compressed = await Promise.all(
        imagePreviews.map(({ file }) => compress(file))
      );

      // 3. Subir imágenes a Storage
      const imageUrls = await Promise.all(
        compressed.map((f, idx) => uploadToBucket(f, newProduct.id, idx))
      );

      // 4. Guardar referencias en product_images
      const { error: imagesError } = await supabase
        .from('product_images')
        .insert(imageUrls.map((url, idx) => ({
          product_id: newProduct.id,
          url,
          idx,
        })));

      if (imagesError) throw imagesError;

      // 5. Actualizar cover_url
      const { error: updateError } = await supabase
        .from('products')
        .update({ cover_url: imageUrls[0] })
        .eq('id', newProduct.id);

      if (updateError) throw updateError;

      // Success
      showMsg('success', '✅ Producto agregado correctamente');
      
      // Limpiar form
      setTitle(''); 
      setDescription(''); 
      setPrice(''); 
      imagePreviews.forEach(({ preview }) => URL.revokeObjectURL(preview));
      setImagePreviews([]);
      setSaleType('direct'); 
      setCondition('nuevo'); 
      setCategoryId(null);
      
    } catch (err: any) {
      showMsg('error', '❌ ' + (err?.message ?? 'Error al guardar'));
    } finally {
      setLoading(false);
    }
  }

  // Limpiar previews al desmontar
  useEffect(() => {
    return () => {
      imagePreviews.forEach(({ preview }) => URL.revokeObjectURL(preview));
    };
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Nuevo producto</h1>
        <Link href="/dashboard" className="underline text-sm">← Volver</Link>
      </div>

      {msg && (
        <div className={`mb-4 p-3 rounded ${
          msg.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {msg.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 max-w-3xl">
        {/* Título */}
        <div>
          <label className="block text-sm font-medium mb-1">Título del producto</label>
          <input
            type="text"
            placeholder="Ej: Zapatillas deportivas Nike"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="border p-2 w-full rounded"
            required
          />
        </div>

        {/* Descripción */}
        <div>
          <label className="block text-sm font-medium mb-1">Descripción</label>
          <textarea
            placeholder="Detalles del producto, estado, etc..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="border p-2 w-full rounded min-h-[100px]"
          />
        </div>

        {/* Precio, Tipo de venta, Condición */}
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Precio (Gs.) *</label>
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
            <label className="block text-sm font-medium mb-1">Tipo de venta</label>
            <div className="flex gap-2">
              <button
                type="button"
                className={`px-4 py-2 border rounded ${
                  saleType === 'direct' ? 'bg-black text-white' : ''
                }`}
                onClick={() => setSaleType('direct')}
              >
                Directa
              </button>
              <button
                type="button"
                className={`px-4 py-2 border rounded ${
                  saleType === 'auction' ? 'bg-black text-white' : ''
                }`}
                onClick={() => setSaleType('auction')}
              >
                Subasta
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Condición</label>
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

        {/* Categoría */}
        <div>
          <label className="block text-sm font-medium mb-1">Categoría *</label>
          <select
            className="border p-2 w-full rounded"
            value={categoryId ?? ''}
            onChange={(e) => setCategoryId(e.target.value || null)}
            required
          >
            <option value="">— Selecciona una categoría —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Imágenes */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Imágenes ({imagesCount}/{MAX_IMAGES}) * — La primera será la portada
          </label>
          
          {/* Vista previa de imágenes */}
          {imagePreviews.length > 0 && (
            <div className="grid grid-cols-5 gap-2 mb-3">
              {imagePreviews.map((preview, idx) => (
                <div key={idx} className="relative">
                  <img
                    src={preview.preview}
                    alt={`Preview ${idx + 1}`}
                    className="w-full h-24 object-cover rounded border"
                  />
                  {idx === 0 && (
                    <span className="absolute top-1 left-1 bg-blue-500 text-white text-xs px-1 rounded">
                      Portada
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute top-1 right-1 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Input de archivos */}
          <input
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="border p-2 w-full rounded"
            disabled={imagesCount >= MAX_IMAGES}
          />
          
          {imagesCount >= MAX_IMAGES && (
            <p className="text-sm text-orange-600 mt-1">
              Límite de {MAX_IMAGES} imágenes alcanzado
            </p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="bg-black text-white px-6 py-3 rounded font-medium hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? 'Subiendo…' : 'Agregar producto'}
        </button>
      </form>
    </main>
  );
}
