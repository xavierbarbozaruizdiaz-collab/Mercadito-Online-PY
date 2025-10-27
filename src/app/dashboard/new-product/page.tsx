'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function NewProduct() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function uploadImage(file: File) {
    const fileName = `${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage
      .from('products-public')
      .upload(fileName, file);

    if (error) throw error;

    const { data: publicUrlData } = supabase.storage
      .from('products-public')
      .getPublicUrl(fileName);

    return publicUrlData.publicUrl;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      let image_url = null;

      if (file) {
        image_url = await uploadImage(file);
      }

      const { error } = await supabase.from('products').insert([
        {
          title,
          description,
          price: parseFloat(price),
          image_url,
        },
      ]);

      if (error) throw error;

      setMessage('✅ Producto agregado correctamente');
      setTitle('');
      setDescription('');
      setPrice('');
      setFile(null);
    } catch (err: any) {
      console.error(err);
      setMessage('❌ Error al subir el producto');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-2xl font-bold mb-4">Nuevo producto</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Título"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="border p-2 w-full rounded"
          required
        />
        <textarea
          placeholder="Descripción"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="border p-2 w-full rounded"
        />
        <input
          type="number"
          placeholder="Precio"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="border p-2 w-full rounded"
          required
        />
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="border p-2 w-full rounded"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-black text-white px-4 py-2 rounded"
        >
          {loading ? 'Subiendo...' : 'Agregar producto'}
        </button>
      </form>

      {message && <p className="mt-4 text-sm">{message}</p>}
    </main>
  );
}
