'use client';

import { useEffect, useMemo, useState } from 'react';
import imageCompression from 'browser-image-compression';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

const MAX_IMAGES = 5; // Reducido de 10 a 5 para ser más razonable

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
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [dragActive, setDragActive] = useState(false);
  const [hoveredImage, setHoveredImage] = useState<number | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('id, name')
          .order('name', { ascending: true });
        
        if (error) {
          showMsg('error', `Error cargando categorías: ${error.message}`);
        } else if (data) {
          setCategories(data);
        } else {
          showMsg('error', 'No se pudieron cargar las categorías');
        }
      } catch (err) {
        showMsg('error', 'Error de conexión con la base de datos');
      }
    })();
  }, []);

  const priceNumber = useMemo(() => Number(price || 0), [price]);
  const imagesCount = imagePreviews.length;

  // Validación en tiempo real
  const validateField = (field: string, value: any) => {
    const errors = { ...validationErrors };
    
    switch (field) {
      case 'title':
        if (!value?.trim()) {
          errors.title = 'El título es requerido';
        } else if (value.trim().length < 3) {
          errors.title = 'El título debe tener al menos 3 caracteres';
        } else {
          delete errors.title;
        }
        break;
      case 'price':
        if (!value || Number(value) <= 0) {
          errors.price = 'El precio debe ser mayor a 0';
        } else {
          delete errors.price;
        }
        break;
      case 'categoryId':
        if (!value) {
          errors.categoryId = 'Selecciona una categoría';
        } else {
          delete errors.categoryId;
        }
        break;
      case 'images':
        if (value === 0) {
          errors.images = 'Agrega al menos una imagen';
        } else {
          delete errors.images;
        }
        break;
    }
    
    setValidationErrors(errors);
  };

  // Validar formulario completo
  const isFormValid = useMemo(() => {
    return (
      title.trim().length >= 3 &&
      priceNumber > 0 &&
      categoryId &&
      imagePreviews.length > 0 &&
      Object.keys(validationErrors).length === 0
    );
  }, [title, priceNumber, categoryId, imagePreviews.length, validationErrors]);

  // Procesar archivos (común para input y drag&drop)
  function processFiles(files: FileList | File[]) {
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(f => {
      const ext = f.name.split('.').pop()?.toLowerCase();
      const isValidType = ['jpg', 'jpeg', 'png', 'webp'].includes(ext || '');
      const isValidSize = f.size <= 5 * 1024 * 1024; // 5MB max
      return isValidType && isValidSize;
    });

    if (validFiles.length === 0 && fileArray.length > 0) {
      showMsg('error', 'Solo se permiten imágenes JPG, PNG o WEBP (máx 5MB)');
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
    
    // Validar imágenes después de agregar
    setTimeout(() => validateField('images', imagePreviews.length + toAdd.length), 100);
  }

  // Manejar selección de archivos
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  }

  // Drag & Drop handlers
  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  }

  // Reordenar imágenes
  function moveImage(fromIndex: number, toIndex: number) {
    setImagePreviews(prev => {
      const newPreviews = [...prev];
      const [movedItem] = newPreviews.splice(fromIndex, 1);
      newPreviews.splice(toIndex, 0, movedItem);
      return newPreviews;
    });
  }

  // Eliminar imagen de preview
  function removeImage(idx: number) {
    setImagePreviews(prev => {
      const newPreviews = [...prev];
      newPreviews[idx] && URL.revokeObjectURL(newPreviews[idx].preview);
      const filtered = newPreviews.filter((_, i) => i !== idx);
      
      // Validar imágenes después de eliminar
      setTimeout(() => validateField('images', filtered.length), 100);
      
      return filtered;
    });
  }

  // Limpiar todas las imágenes
  function clearAllImages() {
    imagePreviews.forEach(({ preview }) => URL.revokeObjectURL(preview));
    setImagePreviews([]);
    validateField('images', 0);
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

  async function uploadToBucket(f: File, productId: string, idx: number) {
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
      const seller_id = session?.session?.user?.id ?? null;

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
          seller_id,
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
        compressed.map((f, idx) => uploadToBucket(f, newProduct.id.toString(), idx))
      );

      // 4. Guardar referencias en product_images
      const { error: imagesError } = await supabase
        .from('product_images')
        .insert(imageUrls.map((url, idx) => ({
          product_id: newProduct.id,
          image_url: url,
          url: url, // Para compatibilidad
          is_cover: idx === 0, // La primera imagen es la portada
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
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header mejorado */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                Nuevo Producto
              </h1>
              <p className="text-gray-600">Completa la información para publicar tu producto</p>
            </div>
            <Link 
              href="/dashboard" 
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Volver al dashboard
            </Link>
          </div>
        </div>

        {msg && (
          <div className={`mb-6 p-4 rounded-xl border-2 ${
            msg.type === 'success' 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <div className="flex items-center gap-3">
              {msg.type === 'success' ? (
                <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              <p className="font-medium">{msg.text}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
        {/* Sección de información básica */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Información del Producto</h2>
          </div>

          <div className="space-y-6">
            {/* Título */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Título del producto *</label>
              <input
                type="text"
                placeholder="Ej: Zapatillas deportivas Nike"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  validateField('title', e.target.value);
                }}
                className={`w-full px-4 py-3 border-2 rounded-lg transition-colors ${
                  validationErrors.title 
                    ? 'border-red-500 focus:ring-red-500' 
                    : title.trim().length >= 3 
                      ? 'border-green-500 focus:ring-green-500' 
                      : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                }`}
                required
              />
              {validationErrors.title && (
                <p className="text-red-600 text-sm mt-2 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {validationErrors.title}
                </p>
              )}
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Descripción</label>
              <textarea
                placeholder="Detalles del producto, estado, características especiales, etc..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors min-h-[120px] resize-none"
              />
            </div>
          </div>
        </div>

        {/* Sección de detalles */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Detalles de Venta</h2>
          </div>

          <div className="space-y-6">
            {/* Precio, Tipo de venta, Condición */}
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Precio (Gs.) *</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">₲</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    value={price}
                    onChange={(e) => {
                      setPrice(e.target.value);
                      validateField('price', e.target.value);
                    }}
                    className={`w-full pl-10 pr-4 py-3 border-2 rounded-lg transition-colors ${
                      validationErrors.price 
                        ? 'border-red-500 focus:ring-red-500' 
                        : priceNumber > 0 
                          ? 'border-green-500 focus:ring-green-500' 
                          : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                    }`}
                    placeholder="0"
                    required
                  />
                </div>
                {validationErrors.price && (
                  <p className="text-red-600 text-sm mt-2 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {validationErrors.price}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Tipo de venta</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all ${
                      saleType === 'direct' 
                        ? 'bg-blue-600 text-white shadow-lg' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-gray-300'
                    }`}
                    onClick={() => setSaleType('direct')}
                  >
                    Venta Directa
                  </button>
                  <button
                    type="button"
                    className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all ${
                      saleType === 'auction' 
                        ? 'bg-purple-600 text-white shadow-lg' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-gray-300'
                    }`}
                    onClick={() => setSaleType('auction')}
                  >
                    Subasta
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Condición</label>
                <select
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
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
              <label className="block text-sm font-semibold text-gray-700 mb-2">Categoría *</label>
              <select
                className={`w-full px-4 py-3 border-2 rounded-lg transition-colors ${
                  validationErrors.categoryId 
                    ? 'border-red-500 focus:ring-red-500' 
                    : categoryId 
                      ? 'border-green-500 focus:ring-green-500' 
                      : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                }`}
                value={categoryId ?? ''}
                onChange={(e) => {
                  setCategoryId(e.target.value || null);
                  validateField('categoryId', e.target.value);
                }}
                required
              >
                <option value="">— Selecciona una categoría —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {validationErrors.categoryId && (
                <p className="text-red-600 text-sm mt-2 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {validationErrors.categoryId}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Sección de imágenes */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Imágenes del Producto</h2>
              <p className="text-sm text-gray-600">La primera imagen será la portada ({imagesCount}/{MAX_IMAGES})</p>
            </div>
            {imagePreviews.length > 0 && (
              <button
                type="button"
                onClick={clearAllImages}
                className="inline-flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Limpiar todas
              </button>
            )}
          </div>
          
          {/* Vista previa de imágenes */}
          {imagePreviews.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-6">
              {imagePreviews.map((preview, idx) => (
                <div 
                  key={idx} 
                  className="relative group cursor-move rounded-xl overflow-hidden border-2 border-gray-200 hover:border-blue-400 transition-all"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', idx.toString());
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
                    if (fromIndex !== idx) {
                      moveImage(fromIndex, idx);
                    }
                  }}
                >
                  <div className="aspect-square relative">
                    <img
                      src={preview.preview}
                      alt={`Preview ${idx + 1}`}
                      className={`w-full h-full object-cover transition-transform duration-300 ${
                        hoveredImage === idx ? 'scale-110' : ''
                      }`}
                      onMouseEnter={() => setHoveredImage(idx)}
                      onMouseLeave={() => setHoveredImage(null)}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  </div>
                  {idx === 0 && (
                    <span className="absolute top-2 left-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
                      Portada
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute top-2 right-2 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <div className="absolute bottom-2 left-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity text-center">
                    Arrastra para reordenar
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Área de drag & drop */}
          <div
            className={`border-2 border-dashed rounded-xl p-8 sm:p-12 text-center transition-all ${
              dragActive 
                ? 'border-blue-500 bg-blue-50 border-solid' 
                : imagesCount >= MAX_IMAGES 
                  ? 'border-gray-300 bg-gray-50 cursor-not-allowed' 
                  : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/50'
            }`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {imagesCount >= MAX_IMAGES ? (
              <div className="text-gray-500">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-lg font-bold mb-2">Límite de imágenes alcanzado</p>
                <p className="text-sm">Elimina algunas imágenes para agregar más</p>
              </div>
            ) : (
              <div>
                <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-lg font-bold text-gray-900 mb-2">
                  {dragActive ? 'Suelta las imágenes aquí' : 'Arrastra imágenes aquí'}
                </p>
                <p className="text-sm text-gray-600 mb-6">
                  o haz clic para seleccionar archivos
                </p>
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                  id="image-upload"
                  disabled={imagesCount >= MAX_IMAGES}
                />
                <label
                  htmlFor="image-upload"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold cursor-pointer hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Seleccionar imágenes
                </label>
                <p className="text-xs text-gray-500 mt-4">
                  JPG, PNG, WEBP • Máx 5MB por imagen • {MAX_IMAGES - imagesCount} restantes
                </p>
              </div>
            )}
          </div>
          
          {validationErrors.images && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {validationErrors.images}
              </p>
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <button
            type="submit"
            disabled={loading || !isFormValid}
            className={`flex-1 inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl font-bold transition-all ${
              isFormValid && !loading
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {loading ? (
              <>
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Publicando producto...
              </>
            ) : isFormValid ? (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Publicar Producto
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Completa todos los campos
              </>
            )}
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-6 py-4 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Cancelar
          </Link>
        </div>
      </form>
    </main>
  );
}
