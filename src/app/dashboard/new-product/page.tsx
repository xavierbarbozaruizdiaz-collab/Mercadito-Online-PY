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

  // Función para cargar categorías
  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .order('name', { ascending: true });
      
      if (error) {
        console.error('Error cargando categorías:', error);
        // No mostrar error al usuario aquí, solo loguear
      } else if (data) {
        setCategories(data);
      }
    } catch (err) {
      console.error('Error de conexión cargando categorías:', err);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const priceNumber = useMemo(() => Number(price || 0), [price]);
  const imagesCount = imagePreviews.length;

  // Validación en tiempo real
  const validateField = (field: string, value: string | number) => {
    const errors = { ...validationErrors };
    
    switch (field) {
      case 'title':
        if (!String(value)?.trim()) {
          errors.title = 'El título es requerido';
        } else if (String(value).trim().length < 3) {
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
      const { data: session, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        throw new Error('Error al obtener la sesión del usuario');
      }
      
      const seller_id = session?.session?.user?.id;
      
      if (!seller_id) {
        throw new Error('No estás autenticado. Por favor, inicia sesión.');
      }

      console.log('📦 Creando producto con datos:', {
        title: title.trim(),
        description: description.trim() || null,
        price: priceNumber,
        sale_type: saleType,
        condition,
        category_id: categoryId,
        seller_id,
      });

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

      if (insertError) {
        console.error('❌ Error insertando producto:', insertError);
        throw new Error(insertError.message || 'Error al crear el producto');
      }
      
      if (!newProduct) {
        throw new Error('No se pudo crear el producto');
      }
      
      console.log('✅ Producto creado:', newProduct.id);
      showMsg('success', '📦 Producto creado. Comprimiendo imágenes...');

      // 2. Comprimir imágenes
      showMsg('success', '🖼️ Comprimiendo imágenes (1/3)...');
      const compressed = await Promise.all(
        imagePreviews.map(({ file }) => compress(file))
      );

      // 3. Subir imágenes a Storage
      showMsg('success', '☁️ Subiendo imágenes (2/3)...');
      const imageUrls = await Promise.all(
        compressed.map((f, idx) => uploadToBucket(f, newProduct.id.toString(), idx))
      );

      // 4. Guardar referencias en product_images
      showMsg('success', '💾 Guardando referencias de imágenes (3/3)...');
      const { error: imagesError } = await supabase
        .from('product_images')
        .insert(imageUrls.map((url, idx) => ({
          product_id: newProduct.id,
          image_url: url,
          url: url, // Para compatibilidad
          is_cover: idx === 0, // La primera imagen es la portada
        })));

      if (imagesError) {
        console.error('❌ Error guardando imágenes:', imagesError);
        throw new Error(`Error al guardar imágenes: ${imagesError.message}`);
      }

      // 5. Actualizar cover_url
      showMsg('success', '🔄 Actualizando imagen de portada...');
      const { error: updateError } = await supabase
        .from('products')
        .update({ cover_url: imageUrls[0] })
        .eq('id', newProduct.id);

      if (updateError) {
        console.error('❌ Error actualizando cover_url:', updateError);
        throw new Error(`Error al actualizar portada: ${updateError.message}`);
      }

      console.log('✅ Producto y imágenes creadas exitosamente');
      
      showMsg('success', '✅ Producto creado exitosamente. Redirigiendo...');
      
      // Limpiar formulario
      setTitle('');
      setDescription('');
      setPrice('');
      setSaleType('direct');
      setCondition('nuevo');
      setCategoryId(null);
      imagePreviews.forEach(({ preview }) => URL.revokeObjectURL(preview));
      setImagePreviews([]);
      setValidationErrors({});

      // Recargar categorías por si acaso
      await loadCategories();

      // Redirigir al dashboard después de un breve delay
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 2000);
    } catch (err: any) {
      console.error('❌ Error completo:', err);
      const errorMessage = err instanceof Error 
        ? err.message 
        : (err?.message || 'Error al guardar el producto');
      
      showMsg('error', `❌ ${errorMessage}`);
      
      // Recargar categorías en caso de error para que sigan disponibles
      await loadCategories();
    } finally {
      // Asegurarse de que siempre se libere el loading
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
              onChange={(e) => setCondition(e.target.value as 'nuevo' | 'usado_como_nuevo' | 'usado')}
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
          <div className="flex justify-between items-center mb-1">
            <label className="block text-sm font-medium">
              Imágenes ({imagesCount}/{MAX_IMAGES}) * — La primera será la portada
            </label>
            {imagePreviews.length > 0 && (
              <button
                type="button"
                onClick={clearAllImages}
                className="text-red-600 text-sm hover:text-red-800 underline"
              >
                Limpiar todas
              </button>
            )}
          </div>
          
          {/* Vista previa de imágenes */}
          {imagePreviews.length > 0 && (
            <div className="grid grid-cols-5 gap-2 mb-3">
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
                      moveImage(fromIndex, idx);
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
                  {idx === 0 && (
                    <span className="absolute top-1 left-1 bg-blue-500 text-white text-xs px-1 rounded">
                      Portada
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute top-1 right-1 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                  <div className="absolute bottom-1 left-1 bg-black bg-opacity-50 text-white text-xs px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                    Arrastra para reordenar
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Área de drag & drop */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive 
                ? 'border-blue-500 bg-blue-50' 
                : imagesCount >= MAX_IMAGES 
                  ? 'border-gray-300 bg-gray-50' 
                  : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {imagesCount >= MAX_IMAGES ? (
              <div className="text-gray-500">
                <p className="text-lg font-medium">Límite de imágenes alcanzado</p>
                <p className="text-sm">Elimina algunas imágenes para agregar más</p>
              </div>
            ) : (
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
                  disabled={imagesCount >= MAX_IMAGES}
                />
                <label
                  htmlFor="image-upload"
                  className="bg-black text-white px-4 py-2 rounded cursor-pointer hover:bg-gray-800 transition-colors"
                >
                  Seleccionar imágenes
                </label>
                <p className="text-xs text-gray-400 mt-2">
                  JPG, PNG, WEBP • Máx 5MB por imagen • {MAX_IMAGES - imagesCount} restantes
                </p>
              </div>
            )}
          </div>
          
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
          {loading ? 'Subiendo…' : isFormValid ? 'Agregar producto' : 'Completa todos los campos'}
        </button>
      </form>
    </main>
  );
}
