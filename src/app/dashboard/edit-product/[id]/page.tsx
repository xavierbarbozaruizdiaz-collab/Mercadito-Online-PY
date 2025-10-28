'use client';

import { useEffect, useMemo, useState } from 'react';
import imageCompression from 'browser-image-compression';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

const MAX_IMAGES = 10;

type Category = { id: string; name: string };
type ImagePreview = { file: File; preview: string };
type ExistingImage = { id: string; url: string; idx: number };

export default function EditProduct() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<string>('');
  const [saleType, setSaleType] = useState<'direct' | 'auction'>('direct');
  const [condition, setCondition] = useState<'nuevo' | 'usado' | 'usado_como_nuevo'>('nuevo');
  const [categoryId, setCategoryId] = useState<string | null>(null);

  const [imagePreviews, setImagePreviews] = useState<ImagePreview[]>([]);
  const [existingImages, setExistingImages] = useState<ExistingImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [dragActive, setDragActive] = useState(false);
  const [hoveredImage, setHoveredImage] = useState<number | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);

  // Cargar datos del producto
  useEffect(() => {
    (async () => {
      try {
        // Cargar categorías
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('categories')
          .select('id, name')
          .order('name', { ascending: true });
        
        if (categoriesError) throw categoriesError;
        setCategories(categoriesData || []);

        // Cargar producto
        const { data: productData, error: productError } = await supabase
          .from('products')
          .select('*')
          .eq('id', productId)
          .single();

        if (productError) throw productError;
        if (!productData) throw new Error('Producto no encontrado');

        // Verificar permisos (solo el creador puede editar)
        const { data: session } = await supabase.auth.getSession();
        if (productData.created_by !== session?.session?.user?.id) {
          throw new Error('No tienes permisos para editar este producto');
        }

        // Cargar datos del producto
        setTitle(productData.title || '');
        setDescription(productData.description || '');
        setPrice(productData.price?.toString() || '');
        setSaleType(productData.sale_type || 'direct');
        setCondition(productData.condition || 'nuevo');
        setCategoryId(productData.category_id);

        // Cargar imágenes existentes
        const { data: imagesData, error: imagesError } = await supabase
          .from('product_images')
          .select('id, url, idx')
          .eq('product_id', productId)
          .order('idx', { ascending: true });

        if (imagesError) throw imagesError;
        setExistingImages(imagesData || []);

      } catch (err: any) {
        showMsg('error', '❌ ' + (err?.message ?? 'Error al cargar el producto'));
        setTimeout(() => router.push('/dashboard'), 2000);
      } finally {
        setLoadingData(false);
      }
    })();
  }, [productId, router]);

  const priceNumber = useMemo(() => Number(price || 0), [price]);
  const totalImagesCount = existingImages.length + imagePreviews.length;

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
        if (totalImagesCount === 0) {
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
      totalImagesCount > 0 &&
      Object.keys(validationErrors).length === 0
    );
  }, [title, priceNumber, categoryId, totalImagesCount, validationErrors]);

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
    const remaining = MAX_IMAGES - totalImagesCount;
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
    setTimeout(() => validateField('images', totalImagesCount + toAdd.length), 100);
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

  // Eliminar imagen nueva
  function removeNewImage(idx: number) {
    setImagePreviews(prev => {
      const newPreviews = [...prev];
      newPreviews[idx] && URL.revokeObjectURL(newPreviews[idx].preview);
      const filtered = newPreviews.filter((_, i) => i !== idx);
      
      // Validar imágenes después de eliminar
      setTimeout(() => validateField('images', existingImages.length + filtered.length), 100);
      
      return filtered;
    });
  }

  // Eliminar imagen existente
  async function removeExistingImage(imageId: string) {
    try {
      const { error } = await supabase
        .from('product_images')
        .delete()
        .eq('id', imageId);

      if (error) throw error;

      setExistingImages(prev => prev.filter(img => img.id !== imageId));
      showMsg('success', 'Imagen eliminada correctamente');
    } catch (err: any) {
      showMsg('error', 'Error al eliminar imagen: ' + err.message);
    }
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
      if (totalImagesCount === 0) throw new Error('Agrega al menos una imagen');

      // 1. Actualizar producto
      const { error: updateError } = await supabase
        .from('products')
        .update({
          title: title.trim(),
          description: description.trim() || null,
          price: priceNumber,
          sale_type: saleType,
          condition,
          category_id: categoryId,
        })
        .eq('id', productId);

      if (updateError) throw updateError;

      // 2. Si hay imágenes nuevas, subirlas
      if (imagePreviews.length > 0) {
        // Comprimir imágenes
        const compressed = await Promise.all(
          imagePreviews.map(({ file }) => compress(file))
        );

        // Subir imágenes a Storage
        const imageUrls = await Promise.all(
          compressed.map((f, idx) => uploadToBucket(f, productId, existingImages.length + idx))
        );

        // Guardar referencias en product_images
        const { error: imagesError } = await supabase
          .from('product_images')
          .insert(imageUrls.map((url, idx) => ({
            product_id: productId,
            url,
            idx: existingImages.length + idx,
          })));

        if (imagesError) throw imagesError;
      }

      // 3. Actualizar cover_url si es necesario
      const allImages = [...existingImages, ...imagePreviews.map((_, idx) => ({
        id: `new-${idx}`,
        url: '',
        idx: existingImages.length + idx
      }))];
      
      if (allImages.length > 0) {
        const firstImageUrl = existingImages.length > 0 ? existingImages[0].url : '';
        if (firstImageUrl) {
          const { error: coverError } = await supabase
            .from('products')
            .update({ cover_url: firstImageUrl })
            .eq('id', productId);

          if (coverError) throw coverError;
        }
      }

      // Success
      showMsg('success', '✅ Producto actualizado correctamente');
      
      // Limpiar nuevas imágenes
      imagePreviews.forEach(({ preview }) => URL.revokeObjectURL(preview));
      setImagePreviews([]);
      
    } catch (err: any) {
      showMsg('error', '❌ ' + (err?.message ?? 'Error al actualizar'));
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

  if (loadingData) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando producto...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Editar producto</h1>
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
            onChange={(e) => {
              setTitle(e.target.value);
              validateField('title', e.target.value);
            }}
            className={`border p-2 w-full rounded ${
              validationErrors.title ? 'border-red-500' : title.trim().length >= 3 ? 'border-green-500' : ''
            }`}
            required
          />
          {validationErrors.title && (
            <p className="text-red-500 text-sm mt-1">{validationErrors.title}</p>
          )}
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
              onChange={(e) => {
                setPrice(e.target.value);
                validateField('price', e.target.value);
              }}
              className={`border p-2 w-full rounded ${
                validationErrors.price ? 'border-red-500' : priceNumber > 0 ? 'border-green-500' : ''
              }`}
              required
            />
            {validationErrors.price && (
              <p className="text-red-500 text-sm mt-1">{validationErrors.price}</p>
            )}
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
            className={`border p-2 w-full rounded ${
              validationErrors.categoryId ? 'border-red-500' : categoryId ? 'border-green-500' : ''
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
            <p className="text-red-500 text-sm mt-1">{validationErrors.categoryId}</p>
          )}
        </div>

        {/* Imágenes */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Imágenes ({totalImagesCount}/{MAX_IMAGES}) * — La primera será la portada
          </label>
          
          {/* Imágenes existentes */}
          {existingImages.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium mb-2 text-gray-600">Imágenes actuales:</h3>
              <div className="grid grid-cols-5 gap-2">
                {existingImages.map((img, idx) => (
                  <div key={img.id} className="relative group">
                    <img
                      src={img.url}
                      alt={`Imagen ${idx + 1}`}
                      className="w-full h-24 object-cover rounded border"
                    />
                    {idx === 0 && (
                      <span className="absolute top-1 left-1 bg-blue-500 text-white text-xs px-1 rounded">
                        Portada
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeExistingImage(img.id)}
                      className="absolute top-1 right-1 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Vista previa de imágenes nuevas */}
          {imagePreviews.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium mb-2 text-gray-600">Nuevas imágenes:</h3>
              <div className="grid grid-cols-5 gap-2">
                {imagePreviews.map((preview, idx) => (
                  <div 
                    key={idx} 
                    className="relative group cursor-move"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', idx.toString());
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
                      if (fromIndex !== idx) {
                        // Reordenar solo las nuevas imágenes
                        setImagePreviews(prev => {
                          const newPreviews = [...prev];
                          const [movedItem] = newPreviews.splice(fromIndex, 1);
                          newPreviews.splice(idx, 0, movedItem);
                          return newPreviews;
                        });
                      }
                    }}
                  >
                    <img
                      src={preview.preview}
                      alt={`Preview ${idx + 1}`}
                      className={`w-full h-24 object-cover rounded border transition-transform ${
                        hoveredImage === idx ? 'scale-105 shadow-lg' : ''
                      }`}
                      onMouseEnter={() => setHoveredImage(idx)}
                      onMouseLeave={() => setHoveredImage(null)}
                    />
                    <button
                      type="button"
                      onClick={() => removeNewImage(idx)}
                      className="absolute top-1 right-1 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ×
                    </button>
                    <div className="absolute bottom-1 left-1 bg-black bg-opacity-50 text-white text-xs px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                      Nueva imagen
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Área de drag & drop */}
          {totalImagesCount < MAX_IMAGES && (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <div>
                <div className="text-4xl mb-2">📷</div>
                <p className="text-lg font-medium mb-2">
                  {dragActive ? 'Suelta las imágenes aquí' : 'Arrastra imágenes aquí'}
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  o haz clic para seleccionar archivos
                </p>
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                  id="image-upload"
                />
                <label
                  htmlFor="image-upload"
                  className="bg-black text-white px-4 py-2 rounded cursor-pointer hover:bg-gray-800 transition-colors"
                >
                  Agregar más imágenes
                </label>
                <p className="text-xs text-gray-400 mt-2">
                  JPG, PNG, WEBP • Máx 5MB por imagen • {MAX_IMAGES - totalImagesCount} restantes
                </p>
              </div>
            </div>
          )}

          {totalImagesCount >= MAX_IMAGES && (
            <div className="border-2 border-dashed border-gray-300 bg-gray-50 rounded-lg p-8 text-center">
              <div className="text-gray-500">
                <p className="text-lg font-medium">Límite de imágenes alcanzado</p>
                <p className="text-sm">Elimina algunas imágenes para agregar más</p>
              </div>
            </div>
          )}
          
          {validationErrors.images && (
            <p className="text-red-500 text-sm mt-1">{validationErrors.images}</p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !isFormValid}
          className={`px-6 py-3 rounded font-medium transition-colors ${
            isFormValid && !loading
              ? 'bg-black text-white hover:bg-gray-800'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {loading ? 'Actualizando…' : isFormValid ? 'Actualizar producto' : 'Completa todos los campos'}
        </button>
      </form>
    </main>
  );
}

