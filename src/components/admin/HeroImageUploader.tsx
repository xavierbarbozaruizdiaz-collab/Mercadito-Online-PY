'use client';

import imageCompression from 'browser-image-compression';
import { useState } from 'react';

type Props = {
  value?: string | null;
  onChange: (storagePath: string | null) => void;
};

export default function HeroImageUploader({ value, onChange }: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      setUploading(true);
      const compressed = await imageCompression(file, {
        maxWidthOrHeight: 1920,
        maxSizeMB: 1.2,
        useWebWorker: true,
      });
      setPreview(URL.createObjectURL(compressed));
      const form = new FormData();
      form.append('file', compressed, compressed.name);
      const res = await fetch('/api/admin/hero/upload', { method: 'POST', body: form });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || 'upload failed');
      onChange(json.storagePath as string);
    } catch (err: any) {
      setError(err?.message || 'Error al subir');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <input 
          type="file" 
          accept="image/*" 
          onChange={handleFile}
          disabled={uploading}
          className="hidden"
          id="hero-image-upload"
        />
        <label
          htmlFor="hero-image-upload"
          className={`
            inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed cursor-pointer
            transition-colors
            ${uploading 
              ? 'bg-gray-100 border-gray-300 cursor-not-allowed' 
              : 'bg-white border-gray-300 hover:border-blue-500 hover:bg-blue-50'
            }
          `}
        >
          <svg 
            className="w-5 h-5 text-gray-600" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
            />
          </svg>
          <span className="text-sm font-medium text-gray-700">
            {uploading ? 'Subiendo imagen…' : value ? 'Cambiar imagen' : 'Subir imagen'}
          </span>
        </label>
      </div>
      
      {uploading && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500"></div>
          <span>Comprimiendo y subiendo…</span>
        </div>
      )}
      
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </div>
      )}
      
      {(preview || value) && (
        <div className="relative border rounded-lg overflow-hidden bg-gray-50 p-2">
          <img 
            src={preview || value || ''} 
            alt="Preview" 
            className="rounded border max-h-48 w-full object-cover"
          />
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setPreview(null);
              }}
              className="absolute top-4 right-4 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-colors"
              title="Eliminar imagen"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
}



