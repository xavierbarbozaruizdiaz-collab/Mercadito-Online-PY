'use client';

import { useEffect, useMemo, useState } from 'react';
import imageCompression from 'browser-image-compression';
import { supabase, getSessionWithTimeout } from '@/lib/supabaseClient';
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
  
  // Campos específicos para subastas
  const [auctionStartingPrice, setAuctionStartingPrice] = useState<string>('');
  const [auctionBuyNowPrice, setAuctionBuyNowPrice] = useState<string>('');
  const [auctionStartDate, setAuctionStartDate] = useState<string>('');

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

        // Cast para evitar errores de tipo de TypeScript
        const product = productData as any;

        // Verificar permisos (solo el vendedor puede editar)
        const { data: session } = await supabase.auth.getSession();
        if (product.seller_id !== session?.session?.user?.id) {
          throw new Error('No tienes permisos para editar este producto');
        }

        // Cargar datos del producto
        setTitle(product.title || '');
        setDescription(product.description || '');
        setPrice(product.price?.toString() || '');
        setSaleType(product.sale_type || 'direct');
        setCondition(product.condition || 'nuevo');
        setCategoryId(product.category_id);
        
        // Cargar datos de subasta si existen (desde campos directos)
        if (product.sale_type === 'auction') {
          // Usar campos directos de la tabla products
          const startingPrice = product.current_bid || product.price || product.min_bid_increment || 0;
          setAuctionStartingPrice(startingPrice.toString());
          
          // Buscar buy_now_price en attributes si existe, o usar null
          const buyNowPrice = product.attributes?.auction?.buy_now_price || 
                            (product.attributes?.buy_now_price) || 
                            null;
          if (buyNowPrice) {
            setAuctionBuyNowPrice(buyNowPrice.toString());
          }
          
          // Fecha de inicio desde auction_start_at
          if (product.auction_start_at) {
            const startDate = new Date(product.auction_start_at);
            const localDateTime = new Date(startDate.getTime() - startDate.getTimezoneOffset() * 60000)
              .toISOString()
              .slice(0, 16);
            setAuctionStartDate(localDateTime);
          }
        }

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
        // Solo validar precio si NO es subasta
        if (saleType !== 'auction') {
          if (!value || Number(value) <= 0) {
            errors.price = 'El precio debe ser mayor a 0';
          } else {
            delete errors.price;
          }
        } else {
          // Si es subasta, eliminar cualquier error de precio
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
    // Para subastas, validar precio base en lugar de precio normal
    const priceValid = saleType === 'auction' 
      ? (auctionStartingPrice && Number(auctionStartingPrice) > 0 && auctionStartDate)
      : (priceNumber > 0);
    
    return (
      title.trim().length >= 3 &&
      priceValid &&
      categoryId &&
      totalImagesCount > 0 &&
      Object.keys(validationErrors).length === 0
    );
  }, [title, priceNumber, categoryId, totalImagesCount, validationErrors, saleType, auctionStartingPrice, auctionStartDate]);

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
      
      // Validación según tipo de venta
      let finalPrice = priceNumber;
      let attributes: any = null;
      
      if (saleType === 'auction') {
        if (!auctionStartingPrice || Number(auctionStartingPrice) <= 0) {
          throw new Error('El precio base es requerido para subastas');
        }
        if (!auctionStartDate) {
          throw new Error('La fecha de inicio de subasta es requerida');
        }
        const startDate = new Date(auctionStartDate);
        
        // Permitir fechas pasadas para pruebas (igual que en new-product)
        // if (startDate < new Date()) {
        //   throw new Error('La fecha de inicio debe ser en el futuro');
        // }
        
        if (auctionBuyNowPrice && Number(auctionBuyNowPrice) <= Number(auctionStartingPrice)) {
          throw new Error('El precio de compra ahora debe ser mayor que el precio base');
        }
        
        finalPrice = Number(auctionStartingPrice);
        
        // Calcular fecha de fin (5 minutos para pruebas, igual que new-product)
        const durationMinutes = 5; // 5 minutos para pruebas - cambiar a 1440 para producción
        const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);
        
        // Preparar atributos de subasta (para compatibilidad, pero usaremos campos directos)
        attributes = {
          auction: {
            starting_price: Number(auctionStartingPrice),
            buy_now_price: auctionBuyNowPrice && Number(auctionBuyNowPrice) > 0 
              ? Number(auctionBuyNowPrice) 
              : null,
            start_date: startDate.toISOString(),
          }
        };
      } else {
        if (!priceNumber || priceNumber <= 0) throw new Error('Precio inválido');
        finalPrice = priceNumber;
      }

      if (!categoryId) throw new Error('Selecciona una categoría');
      if (totalImagesCount === 0) throw new Error('Agrega al menos una imagen');

      // 1. Actualizar producto
      const updateData: any = {
        title: title.trim(),
        description: description.trim() || null,
        price: finalPrice,
        sale_type: saleType,
        condition,
        category_id: categoryId,
      };
      
      // Si es subasta, agregar campos directos de subasta (igual que new-product)
      if (saleType === 'auction') {
        const startDate = new Date(auctionStartDate);
        
        // Logs para debugging de zona horaria
        const timezoneOffset = startDate.getTimezoneOffset();
        const paraguayOffset = -240; // UTC-4
        
        console.log('🕐 Información de zona horaria (edición):', {
          horaIngresada: auctionStartDate,
          horaInterpretadaLocal: startDate.toString(),
          horaUTC: startDate.toISOString(),
          offsetZonaHoraria: timezoneOffset,
          offsetParaguay: paraguayOffset,
          diferenciaConParaguay: timezoneOffset - paraguayOffset
        });
        
        const durationMinutes = 5; // 5 minutos para pruebas
        const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);
        
        updateData.auction_status = 'scheduled';
        updateData.auction_start_at = startDate.toISOString();
        updateData.auction_end_at = endDate.toISOString();
        updateData.current_bid = finalPrice; // Precio inicial
        updateData.min_bid_increment = 1000; // Por defecto
        
        // También guardar buy_now_price en attributes si existe
        if (attributes && attributes.auction?.buy_now_price) {
          updateData.attributes = attributes;
        }
      } else {
        // Si cambió de subasta a directa, limpiar campos de subasta
        updateData.auction_status = null;
        updateData.auction_start_at = null;
        updateData.auction_end_at = null;
        updateData.current_bid = null;
        updateData.min_bid_increment = null;
        updateData.attributes = null;
      }
      
      const { error: updateError } = await (supabase as any)
        .from('products')
        .update(updateData)
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
        const { error: imagesError } = await (supabase as any)
          .from('product_images')
          .insert(imageUrls.map((url, idx) => ({
            product_id: productId,
            url,
            idx: existingImages.length + idx,
          })) as any);

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
          const { error: coverError } = await (supabase as any)
            .from('products')
            .update({ cover_url: firstImageUrl } as any)
            .eq('id', productId);

          if (coverError) throw coverError;
        }
      }

      // Success
      showMsg('success', '✅ Producto actualizado correctamente. Redirigiendo...');
      
      // Limpiar nuevas imágenes
      imagePreviews.forEach(({ preview }) => URL.revokeObjectURL(preview));
      setImagePreviews([]);
      
      // Redirigir al dashboard después de un breve delay
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
      
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
          {/* Precio - Solo mostrar cuando NO es subasta */}
          {saleType !== 'auction' && (
            <div>
              <label className="block text-sm font-medium mb-1">Precio (Gs.) *</label>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={price}
                onChange={(e) => {
                  setPrice(e.target.value);
                  if (saleType !== 'auction') {
                    validateField('price', e.target.value);
                  }
                }}
                className={`border p-2 w-full rounded ${
                  validationErrors.price ? 'border-red-500' : priceNumber > 0 ? 'border-green-500' : ''
                }`}
                required={saleType !== 'auction'}
              />
              {validationErrors.price && (
                <p className="text-red-500 text-sm mt-1">{validationErrors.price}</p>
              )}
            </div>
          )}

          <div className={`md:col-span-${saleType !== 'auction' ? '2' : '3'}`}>
            <label className="block text-sm font-medium mb-3">Tipo de venta *</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Opción: Venta Directa */}
              <button
                type="button"
                onClick={() => {
                  setSaleType('direct');
                  // Limpiar error de validación del precio ya que ahora será requerido
                  if (validationErrors.price) {
                    setValidationErrors(prev => {
                      const newErrors = { ...prev };
                      delete newErrors.price;
                      return newErrors;
                    });
                  }
                }}
                className={`relative p-4 border-2 rounded-lg transition-all text-left ${
                  saleType === 'direct'
                    ? 'border-blue-500 bg-blue-50 shadow-md ring-2 ring-blue-200'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                    saleType === 'direct' 
                      ? 'border-blue-500 bg-blue-500' 
                      : 'border-gray-300 bg-white'
                  }`}>
                    {saleType === 'direct' && (
                      <div className="w-2 h-2 rounded-full bg-white"></div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">💰</span>
                      <h3 className={`font-semibold ${
                        saleType === 'direct' ? 'text-blue-900' : 'text-gray-900'
                      }`}>
                        Precio Fijo
                      </h3>
                      {saleType === 'direct' && (
                        <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">Seleccionado</span>
                      )}
                    </div>
                    <p className={`text-sm ${
                      saleType === 'direct' ? 'text-blue-700' : 'text-gray-600'
                    }`}>
                      El comprador paga el precio establecido directamente. Ideal para ventas rápidas.
                    </p>
                  </div>
                </div>
              </button>

              {/* Opción: Subasta */}
              <button
                type="button"
                onClick={() => {
                  setSaleType('auction');
                  // Limpiar error de validación del precio ya que no será requerido
                  if (validationErrors.price) {
                    setValidationErrors(prev => {
                      const newErrors = { ...prev };
                      delete newErrors.price;
                      return newErrors;
                    });
                  }
                  console.log('Tipo de venta cambiado a: auction');
                }}
                className={`relative p-4 border-2 rounded-lg transition-all text-left ${
                  saleType === 'auction'
                    ? 'border-yellow-500 bg-yellow-50 shadow-md ring-2 ring-yellow-200'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                    saleType === 'auction' 
                      ? 'border-yellow-500 bg-yellow-500' 
                      : 'border-gray-300 bg-white'
                  }`}>
                    {saleType === 'auction' && (
                      <div className="w-2 h-2 rounded-full bg-white"></div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">🔨</span>
                      <h3 className={`font-semibold ${
                        saleType === 'auction' ? 'text-yellow-900' : 'text-gray-900'
                      }`}>
                        Subasta
                      </h3>
                      {saleType === 'auction' && (
                        <span className="text-xs bg-yellow-500 text-white px-2 py-0.5 rounded-full">Seleccionado</span>
                      )}
                    </div>
                    <p className={`text-sm ${
                      saleType === 'auction' ? 'text-yellow-700' : 'text-gray-600'
                    }`}>
                      Los compradores ofertan y el mejor precio gana. Puedes establecer precio mínimo y "compra ahora".
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Campos específicos de subasta */}
          {saleType === 'auction' && (
            <div className="md:col-span-3 bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-4">
              <h3 className="font-semibold text-yellow-900 mb-3">🔨 Información de la Subasta</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Precio base (Gs.) *</label>
                  <input
                    type="number"
                    placeholder="Ej: 100000"
                    min="0"
                    value={auctionStartingPrice}
                    onChange={(e) => setAuctionStartingPrice(e.target.value)}
                    className="border p-2 w-full rounded"
                    required={saleType === 'auction'}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Este es el precio mínimo desde el cual los compradores podrán hacer pujas. La primera puja debe ser igual o mayor a este monto.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Compra ahora (Gs.) (Opcional)</label>
                  <input
                    type="number"
                    placeholder="Ej: 200000"
                    min="0"
                    value={auctionBuyNowPrice}
                    onChange={(e) => setAuctionBuyNowPrice(e.target.value)}
                    className="border p-2 w-full rounded"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Si lo configuras, un comprador podrá comprar el producto inmediatamente a este precio sin esperar el final de la subasta. Debe ser mayor que el precio base.
                  </p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Fecha y hora de inicio *</label>
                  <input
                    type="datetime-local"
                    value={auctionStartDate}
                    onChange={(e) => setAuctionStartDate(e.target.value)}
                    className="border p-2 w-full rounded"
                    required={saleType === 'auction'}
                    // Remover min para permitir fechas pasadas en pruebas
                    // min={new Date().toISOString().slice(0, 16)}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    La subasta comenzará automáticamente en esta fecha y hora. Duración para pruebas: 5 minutos desde el inicio. Puedes seleccionar una fecha pasada para iniciar inmediatamente.
                  </p>
                </div>
              </div>
              <div className="mt-4 bg-yellow-100 border border-yellow-300 rounded p-3">
                <h4 className="font-semibold text-yellow-900 mb-2">¿Cómo funcionan las subastas?</h4>
                <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
                  <li>Los compradores pujan incrementando el precio</li>
                  <li>Duración: 5 minutos desde la fecha de inicio (modo prueba)</li>
                  <li>Quien ofrezca el precio más alto al finalizar gana</li>
                  <li>Si configuraste "Compra ahora", alguien puede comprarlo inmediatamente</li>
                  <li>Puedes usar una fecha pasada para iniciar la subasta inmediatamente</li>
                </ul>
              </div>
            </div>
          )}

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

