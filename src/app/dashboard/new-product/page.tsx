'use client';

import { useEffect, useMemo, useState } from 'react';
import imageCompression from 'browser-image-compression';
import { supabase, getSessionWithTimeout } from '@/lib/supabaseClient';
import Link from 'next/link';

const MAX_IMAGES = 5; // Reducido de 10 a 5 para ser más razonable

type Category = { id: string; name: string };
type ImagePreview = { file: File; preview: string };

// Definición de campos por categoría
type CategoryFields = {
  vehiculos: {
    kilometraje?: string;
    año?: string;
    color?: string;
    documentacion?: string;
    marca?: string;
    modelo?: string;
  };
  // Puedes agregar más categorías aquí
};

type AllCategoryFields = CategoryFields[keyof CategoryFields];

export default function NewProduct() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<string>('');
  const [saleType, setSaleType] = useState<'direct' | 'auction'>('direct');
  const [condition, setCondition] = useState<'nuevo' | 'usado' | 'usado_como_nuevo'>('nuevo');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [storeId, setStoreId] = useState<string | null>(null);
  
  // Campos específicos para subastas
  const [auctionStartingPrice, setAuctionStartingPrice] = useState<string>('');
  const [auctionBuyNowPrice, setAuctionBuyNowPrice] = useState<string>('');
  const [auctionStartDate, setAuctionStartDate] = useState<string>('');
  
  // Campos específicos por categoría
  const [categoryFields, setCategoryFields] = useState<AllCategoryFields>({});

  const [imagePreviews, setImagePreviews] = useState<ImagePreview[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [dragActive, setDragActive] = useState(false);
  const [hoveredImage, setHoveredImage] = useState<number | null>(null);
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  
  // Función para obtener el nombre de la categoría seleccionada
  const selectedCategoryName = useMemo(() => {
    if (!categoryId) return null;
    const cat = categories.find(c => c.id === categoryId);
    return cat?.name?.toLowerCase() || null;
  }, [categoryId, categories]);

  // Tiendas del vendedor
  type Store = { id: string; name: string; location?: string | null };
  const [stores, setStores] = useState<Store[]>([]);
  const [storesLoading, setStoresLoading] = useState<boolean>(true);

  // Función para cargar categorías
  const loadCategories = async () => {
    setCategoriesLoading(true);
    try {
      console.log('🔄 Cargando categorías...');
      
      // Intentar query simple sin joins que puedan activar políticas problemáticas
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')  // Solo campos necesarios, sin joins
        .order('name', { ascending: true });
      
      if (error) {
        // Si hay error de recursión infinita, mostrar mensaje específico
        if (error.code === '42P17' || error.message?.includes('infinite recursion')) {
          console.error('❌ Error de recursión infinita en políticas RLS:', error);
          showMsg('error', 'Error de configuración en la base de datos. Contacta al administrador.');
          // Intentar con categorías hardcodeadas como fallback temporal
          setCategories([
            { id: 'temp-1', name: 'Electrónicos' },
            { id: 'temp-2', name: 'Ropa y Accesorios' },
            { id: 'temp-3', name: 'Hogar y Jardín' },
            { id: 'temp-4', name: 'Deportes y Fitness' },
            { id: 'temp-5', name: 'Automotriz' },
            { id: 'temp-6', name: 'Otros' },
          ] as Category[]);
          showMsg('error', '⚠️ Usando categorías temporales. Se requiere corregir políticas RLS en Supabase.');
        } else {
          console.error('❌ Error cargando categorías:', error);
          showMsg('error', `Error cargando categorías: ${error.message}`);
          setCategories([]);
        }
      } else if (data) {
        console.log('✅ Categorías cargadas:', data.length);
        setCategories(data);
      } else {
        console.warn('⚠️ No se recibieron categorías');
        setCategories([]);
      }
    } catch (err: any) {
      console.error('❌ Error de conexión cargando categorías:', err);
      if (err?.code === '42P17' || err?.message?.includes('infinite recursion')) {
        showMsg('error', 'Error de recursión en políticas RLS. Ejecuta la migración fix_profiles_recursion.sql');
      } else {
        showMsg('error', 'Error de conexión al cargar categorías');
      }
      setCategories([]);
    } finally {
      setCategoriesLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  // Cargar tiendas del vendedor
  useEffect(() => {
    const loadStores = async () => {
      setStoresLoading(true);
      try {
        const { data: session, error } = await supabase.auth.getSession();
        if (error) throw error;
        const sellerId = session?.session?.user?.id;
        if (!sellerId) {
          setStores([]);
          return;
        }
        const { data, error: storesError } = await supabase
          .from('stores')
          .select('id, name, location')
          .eq('seller_id', sellerId)
          .order('created_at', { ascending: false });
        if (storesError) throw storesError;
        setStores(data || []);
        // Si solo hay una tienda, preseleccionarla
        if ((data || []).length === 1) {
          setStoreId((data as any)[0].id);
        }
      } catch (e) {
        console.error('Error cargando tiendas:', e);
        setStores([]);
      } finally {
        setStoresLoading(false);
      }
    };
    loadStores();
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
        } else {
          const normalized = String(value).trim().toLowerCase();
          if (normalized.length < 3) {
            errors.title = 'El título debe tener al menos 3 caracteres';
          } else {
            delete errors.title;
          }
        }
        break;
      case 'storeId':
        if ((stores?.length || 0) > 0 && !value) {
          errors.storeId = 'Selecciona una tienda';
        } else {
          delete errors.storeId;
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
    // Para subastas, validar precio base en lugar de precio normal
    const priceValid = saleType === 'auction' 
      ? (auctionStartingPrice && Number(auctionStartingPrice) > 0 && auctionStartDate)
      : (priceNumber > 0);
    
    return (
      title.trim().length >= 3 &&
      priceValid &&
      categoryId &&
      imagePreviews.length > 0 &&
      // Si el usuario tiene tiendas, debe elegir una
      ((stores?.length || 0) === 0 || !!storeId) &&
      Object.keys(validationErrors).length === 0
    );
  }, [title, priceNumber, categoryId, imagePreviews.length, validationErrors, stores?.length, storeId, saleType, auctionStartingPrice, auctionStartDate]);

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

    const newPreviews = toAdd.map((file, index) => {
      try {
        // Validar que el archivo sea realmente una imagen válida
        if (!file.type.startsWith('image/')) {
          throw new Error(`El archivo ${file.name} no es una imagen válida`);
        }
        
        const previewUrl = URL.createObjectURL(file);
        
        // Verificar que el blob URL se creó correctamente
        if (!previewUrl || previewUrl === 'null' || previewUrl === 'undefined') {
          throw new Error(`No se pudo crear la vista previa para ${file.name}`);
        }
        
        return {
          file,
          preview: previewUrl
        };
      } catch (error) {
        console.error(`❌ Error procesando imagen ${file.name}:`, error);
        showMsg('error', `Error al procesar ${file.name}. Intenta con otra imagen.`);
        return null;
      }
    }).filter((preview): preview is ImagePreview => preview !== null);

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
      
      // Validación de precio: para subastas, validar precio base; para venta directa, validar precio
      let finalPrice = priceNumber;
      if (saleType === 'auction') {
        if (!auctionStartingPrice || Number(auctionStartingPrice) <= 0) {
          throw new Error('El precio base es requerido para subastas');
        }
        if (!auctionStartDate) {
          throw new Error('La fecha de inicio de subasta es requerida');
        }
        const startDate = new Date(auctionStartDate);
        // Permitir fechas pasadas para pruebas (comentar para producción)
        // if (startDate < new Date()) {
        //   throw new Error('La fecha de inicio debe ser en el futuro');
        // }
        if (auctionBuyNowPrice && Number(auctionBuyNowPrice) <= Number(auctionStartingPrice)) {
          throw new Error('El precio de compra ahora debe ser mayor que el precio base');
        }
        // Para subastas, el precio principal será el precio base
        finalPrice = Number(auctionStartingPrice);
      } else {
        if (!priceNumber || priceNumber <= 0) throw new Error('Precio inválido');
        finalPrice = priceNumber;
      }
      
      if (!categoryId) throw new Error('Selecciona una categoría');
      if (imagePreviews.length === 0) throw new Error('Agrega al menos una imagen');
      if (stores.length > 0 && !storeId) throw new Error('Selecciona desde qué tienda publicar');

      // Obtener usuario actual (con timeout/retry para evitar cuelgues)
      const { data: session, error: sessionError } = await getSessionWithTimeout();
      
      if (sessionError) {
        throw new Error('Error al obtener la sesión del usuario');
      }
      
      const seller_id = session?.session?.user?.id;
      
      if (!seller_id) {
        throw new Error('No estás autenticado. Por favor, inicia sesión.');
      }

      // Preparar atributos de categoría (limpiar valores vacíos)
      const cleanAttributes: Record<string, any> = {};
      if (selectedCategoryName === 'vehiculos') {
        const vehFields = categoryFields as CategoryFields['vehiculos'];
        if (vehFields.marca?.trim()) cleanAttributes.marca = vehFields.marca.trim();
        if (vehFields.modelo?.trim()) cleanAttributes.modelo = vehFields.modelo.trim();
        if (vehFields.año?.trim()) cleanAttributes.año = vehFields.año.trim();
        if (vehFields.kilometraje?.trim()) cleanAttributes.kilometraje = vehFields.kilometraje.trim();
        if (vehFields.color?.trim()) cleanAttributes.color = vehFields.color.trim();
        if (vehFields.documentacion?.trim()) cleanAttributes.documentacion = vehFields.documentacion.trim();
      }
      
      // Agregar información de subasta si es tipo subasta
      if (saleType === 'auction') {
        const startDate = new Date(auctionStartDate);
        cleanAttributes.auction = {
          starting_price: Number(auctionStartingPrice),
          buy_now_price: auctionBuyNowPrice && Number(auctionBuyNowPrice) > 0 
            ? Number(auctionBuyNowPrice) 
            : null,
          start_date: startDate.toISOString(),
        };
      }

      console.log('📦 Creando producto con datos:', {
        title: title.trim(),
        description: description.trim() || null,
        price: finalPrice,
        sale_type: saleType,
        condition,
        category_id: categoryId,
        seller_id,
        store_id: storeId,
        auction: saleType === 'auction' ? cleanAttributes.auction : null,
      });

      // Calcular fecha de fin de subasta
      let auctionStartAt: string | null = null;
      let auctionEndAt: string | null = null;
      
      if (saleType === 'auction') {
        // auctionStartDate viene del input datetime-local como "YYYY-MM-DDTHH:mm"
        // Este formato se interpreta como hora LOCAL del navegador
        // JavaScript automáticamente convierte a UTC al usar toISOString()
        
        const startDate = new Date(auctionStartDate);
        
        // Logs para debugging de zona horaria
        const timezoneOffset = startDate.getTimezoneOffset(); // en minutos
        const paraguayOffset = -240; // UTC-4 = -240 minutos (o -180 para UTC-3 en horario de verano)
        
        console.log('🕐 Información de zona horaria:', {
          horaIngresada: auctionStartDate,
          horaInterpretadaLocal: startDate.toString(),
          horaUTC: startDate.toISOString(),
          offsetZonaHoraria: timezoneOffset,
          offsetParaguay: paraguayOffset,
          diferenciaConParaguay: timezoneOffset - paraguayOffset,
          esCorrecto: Math.abs(timezoneOffset - paraguayOffset) <= 60 // tolerancia de 1 hora
        });
        
        // Si el offset no coincide con Paraguay, advertir (pero continuar)
        if (Math.abs(timezoneOffset - paraguayOffset) > 60) {
          console.warn('⚠️ ADVERTENCIA: La zona horaria del navegador no coincide con Paraguay (UTC-4). Puede haber diferencias en las fechas.');
        }
        
        auctionStartAt = startDate.toISOString();
        
        // Duración para pruebas: 5 minutos (300 segundos)
        // Cambiar a 1440 para producción (24 horas)
        const durationMinutes = 5; // 5 minutos para pruebas - cambiar a 1440 para producción
        auctionEndAt = new Date(startDate.getTime() + durationMinutes * 60 * 1000).toISOString();
        
        console.log('📅 Fechas de subasta configuradas:', {
          inicioLocal: auctionStartDate,
          inicioUTC: auctionStartAt,
          finUTC: auctionEndAt,
          duracionMinutos: durationMinutes
        });
      }

      // 1. Insertar producto
      const productData: any = {
        title: title.trim(),
        description: description.trim() || null,
        price: finalPrice,
        sale_type: saleType, // Asegurar que sale_type se guarde correctamente
        condition,
        category_id: categoryId,
        seller_id,
        // Guardar tienda si fue seleccionada
        store_id: storeId || null,
        // Guardar atributos específicos de la categoría y subasta
        attributes: Object.keys(cleanAttributes).length > 0 ? cleanAttributes : null,
      };
      
      // Agregar campos de subasta si aplica
      if (saleType === 'auction') {
        // Determinar el estado inicial de la subasta
        // Si la fecha de inicio ya pasó o está muy cerca (dentro de 2 minutos), activar inmediatamente
        const startDate = new Date(auctionStartAt);
        const now = new Date();
        const timeDiff = startDate.getTime() - now.getTime();
        const twoMinutes = 2 * 60 * 1000; // 2 minutos de tolerancia
        
        // Si la fecha ya pasó o está dentro de 2 minutos, activar inmediatamente
        const shouldBeActive = timeDiff <= twoMinutes;
        
        productData.auction_status = shouldBeActive ? 'active' : 'scheduled';
        productData.auction_start_at = auctionStartAt;
        productData.auction_end_at = auctionEndAt;
        productData.current_bid = finalPrice; // Precio inicial
        productData.min_bid_increment = 1000; // Por defecto
        productData.total_bids = 0;
        
        // Si hay precio de compra ahora, guardarlo
        if (auctionBuyNowPrice && Number(auctionBuyNowPrice) > 0) {
          productData.buy_now_price = Number(auctionBuyNowPrice);
        }
        
        console.log('🎯 Estado inicial de subasta:', {
          auction_status: productData.auction_status,
          startAt: auctionStartAt,
          now: now.toISOString(),
          timeDiff: timeDiff,
          shouldBeActive
        });
      }
      
      console.log('💾 Guardando producto:', {
        sale_type: saleType,
        is_auction: saleType === 'auction',
        productData
      });
      
      const { data: newProduct, error: insertError } = await (supabase as any)
        .from('products')
        .insert(productData)
        .select('id, sale_type') // Seleccionar también sale_type para verificar
        .single();

      if (insertError) {
        console.error('❌ Error insertando producto:', insertError);
        throw new Error(insertError.message || 'Error al crear el producto');
      }
      
      // Verificar que el producto se guardó correctamente
      console.log('✅ Producto creado:', {
        id: newProduct?.id,
        sale_type_saved: (newProduct as any)?.sale_type,
        expected_sale_type: saleType,
        match: (newProduct as any)?.sale_type === saleType
      });
      
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
      const { error: imagesError } = await (supabase as any)
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
      const { error: updateError } = await (supabase as any)
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
      setAuctionStartingPrice('');
      setAuctionBuyNowPrice('');
      setAuctionStartDate('');
      setStoreId(stores.length === 1 ? stores[0].id : null);
      setCategoryFields({});
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

        {/* Tipo de venta */}
        <div>
          <label className="block text-sm font-medium mb-3">Tipo de venta *</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Opción: Venta Directa */}
            <button
              type="button"
              onClick={() => {
                setSaleType('direct');
                console.log('Tipo de venta cambiado a: direct');
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

        {/* Precio y Condición */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Solo mostrar precio si NO es subasta */}
          {saleType !== 'auction' && (
            <div>
              <label className="block text-sm font-medium mb-1">
                Precio (Gs.) *
              </label>
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

          <div>
            <label className="block text-sm font-medium mb-1">Condición *</label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value as any)}
              className="border p-2 w-full rounded"
              required
            >
              <option value="nuevo">Nuevo</option>
              <option value="usado_como_nuevo">Usado como nuevo</option>
              <option value="usado">Usado</option>
            </select>
          </div>
        </div>

        {/* Campos específicos de subasta */}
          {saleType === 'auction' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-4">
              <div className="mb-4">
                <h3 className="font-semibold text-yellow-900 mb-2">🔨 Información de la Subasta</h3>
                <p className="text-sm text-yellow-800">
                  Configura los detalles de tu subasta. Los compradores podrán pujar desde el precio base.
                </p>
              </div>
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
                  <p className="text-xs text-gray-600 mt-1 font-medium">💰 Precio inicial</p>
                  <p className="text-xs text-gray-500">
                    Este es el precio mínimo desde el cual los compradores podrán hacer pujas. La primera puja debe ser igual o mayor a este monto.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Compra ahora (Gs.) <span className="text-gray-400 font-normal">(Opcional)</span></label>
                  <input
                    type="number"
                    placeholder="Ej: 200000"
                    min="0"
                    value={auctionBuyNowPrice}
                    onChange={(e) => setAuctionBuyNowPrice(e.target.value)}
                    className="border p-2 w-full rounded"
                  />
                  <p className="text-xs text-gray-600 mt-1 font-medium">⚡ Compra inmediata</p>
                  <p className="text-xs text-gray-500">
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
                  <p className="text-xs text-gray-600 mt-1 font-medium">📅 Inicio de la subasta</p>
                  <p className="text-xs text-gray-500">
                    La subasta comenzará automáticamente en esta fecha y hora. <strong>Duración para pruebas: 5 minutos</strong> desde el inicio. Puedes seleccionar una fecha pasada para iniciar inmediatamente.
                  </p>
                </div>
              </div>
              <div className="mt-4 p-3 bg-yellow-100 border border-yellow-300 rounded-lg">
                <p className="text-xs text-yellow-900">
                  <strong>💡 ¿Cómo funcionan las subastas?</strong><br/>
                  • Los compradores pujan incrementando el precio<br/>
                  • <strong>Duración: 5 minutos</strong> desde la fecha de inicio (modo prueba)<br/>
                  • Quien ofrezca el precio más alto al finalizar gana<br/>
                  • Si configuraste "Compra ahora", alguien puede comprarlo inmediatamente<br/>
                  • Puedes usar una fecha pasada para iniciar la subasta inmediatamente
                </p>
              </div>
            </div>
          )}

        {/* Tienda / Publicar desde */}
        <div>
          <label className="block text-sm font-medium mb-1">Publicar desde</label>
          {storesLoading ? (
            <p className="text-sm text-gray-500">Cargando tus tiendas…</p>
          ) : stores.length === 0 ? (
            <p className="text-sm text-gray-600">
              No tienes tiendas creadas aún. Puedes crear una tienda desde tu perfil para mostrar ubicación.
            </p>
          ) : (
            <select
              className={`border p-2 w-full rounded ${
                validationErrors.storeId ? 'border-red-500' : storeId ? 'border-green-500' : ''
              }`}
              value={storeId ?? ''}
              onChange={(e) => {
                setStoreId(e.target.value || null);
                validateField('storeId', e.target.value);
              }}
              required={stores.length > 0}
              disabled={storesLoading}
            >
              <option value="">— Selecciona una tienda —</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}{s.location ? ` — ${s.location}` : ''}
                </option>
              ))}
            </select>
          )}
          {validationErrors.storeId && (
            <p className="text-red-500 text-sm mt-1">{validationErrors.storeId}</p>
          )}
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
              // Limpiar campos de categoría al cambiar
              setCategoryFields({});
            }}
            required
            disabled={categoriesLoading}
          >
            <option value="">
              {categoriesLoading ? 'Cargando categorías...' : '— Selecciona una categoría —'}
            </option>
            {!categoriesLoading && categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {categoriesLoading && (
            <p className="text-sm text-gray-500 mt-1">Cargando categorías...</p>
          )}
          {!categoriesLoading && categories.length === 0 && (
            <p className="text-yellow-600 text-sm mt-1">
              No hay categorías disponibles. 
              <button 
                type="button"
                onClick={loadCategories}
                className="ml-1 underline hover:text-yellow-800"
              >
                Reintentar
              </button>
            </p>
          )}
          {validationErrors.categoryId && (
            <p className="text-red-500 text-sm mt-1">{validationErrors.categoryId}</p>
          )}
        </div>

        {/* Campos específicos por categoría */}
        {selectedCategoryName === 'vehiculos' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
            <h3 className="font-semibold text-blue-900 mb-3">🚗 Información del Vehículo</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Marca</label>
                <input
                  type="text"
                  placeholder="Ej: Ford, Toyota, Chevrolet..."
                  value={(categoryFields as CategoryFields['vehiculos'])?.marca || ''}
                  onChange={(e) => setCategoryFields(prev => ({
                    ...prev,
                    marca: e.target.value
                  } as CategoryFields['vehiculos']))}
                  className="border p-2 w-full rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Modelo</label>
                <input
                  type="text"
                  placeholder="Ej: Fiesta, Corolla, Cruze..."
                  value={(categoryFields as CategoryFields['vehiculos'])?.modelo || ''}
                  onChange={(e) => setCategoryFields(prev => ({
                    ...prev,
                    modelo: e.target.value
                  } as CategoryFields['vehiculos']))}
                  className="border p-2 w-full rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Año</label>
                <input
                  type="number"
                  placeholder="Ej: 2020"
                  min="1900"
                  max={new Date().getFullYear() + 1}
                  value={(categoryFields as CategoryFields['vehiculos'])?.año || ''}
                  onChange={(e) => setCategoryFields(prev => ({
                    ...prev,
                    año: e.target.value
                  } as CategoryFields['vehiculos']))}
                  className="border p-2 w-full rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Kilometraje</label>
                <input
                  type="number"
                  placeholder="Ej: 50000"
                  min="0"
                  value={(categoryFields as CategoryFields['vehiculos'])?.kilometraje || ''}
                  onChange={(e) => setCategoryFields(prev => ({
                    ...prev,
                    kilometraje: e.target.value
                  } as CategoryFields['vehiculos']))}
                  className="border p-2 w-full rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Color</label>
                <input
                  type="text"
                  placeholder="Ej: Blanco, Negro, Rojo..."
                  value={(categoryFields as CategoryFields['vehiculos'])?.color || ''}
                  onChange={(e) => setCategoryFields(prev => ({
                    ...prev,
                    color: e.target.value
                  } as CategoryFields['vehiculos']))}
                  className="border p-2 w-full rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Documentación</label>
                <select
                  value={(categoryFields as CategoryFields['vehiculos'])?.documentacion || ''}
                  onChange={(e) => setCategoryFields(prev => ({
                    ...prev,
                    documentacion: e.target.value
                  } as CategoryFields['vehiculos']))}
                  className="border p-2 w-full rounded"
                >
                  <option value="">— Selecciona —</option>
                  <option value="al_dia">Al día</option>
                  <option value="solo_titulo">Solo título</option>
                  <option value="solo_cedula_verde">Solo cédula verde</option>
                  <option value="titulo_y_cedula_verde">Título y cédula verde</option>
                  <option value="ninguna">Ninguna de las anteriores</option>
                </select>
              </div>
            </div>
          </div>
        )}

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
            <div className="grid grid-cols-4 gap-3 mb-3">
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
                  {imageErrors[idx] ? (
                    <div className="w-full h-32 sm:h-36 md:h-40 bg-red-50 border-2 border-red-300 rounded flex flex-col items-center justify-center">
                      <span className="text-4xl mb-2">⚠️</span>
                      <span className="text-xs text-red-600 text-center px-2">Error al cargar</span>
                      <button
                        type="button"
                        onClick={() => {
                          try {
                            const newUrl = URL.createObjectURL(preview.file);
                            setImagePreviews(prev => {
                              const updated = [...prev];
                              updated[idx] = { ...updated[idx], preview: newUrl };
                              return updated;
                            });
                            setImageErrors(prev => {
                              const updated = { ...prev };
                              delete updated[idx];
                              return updated;
                            });
                          } catch (error) {
                            console.error('❌ No se pudo recrear el blob URL:', error);
                            showMsg('error', 'No se pudo cargar esta imagen. Elimínala y vuelve a agregarla.');
                          }
                        }}
                        className="mt-2 text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                      >
                        Reintentar
                      </button>
                    </div>
                  ) : (
                    <img
                      src={preview.preview}
                      alt={`Preview ${idx + 1}`}
                      className={`w-full h-32 sm:h-36 md:h-40 object-cover rounded border-2 transition-transform ${
                        hoveredImage === idx ? 'scale-105 shadow-lg border-blue-400' : 'border-gray-200'
                      }`}
                      onMouseEnter={() => setHoveredImage(idx)}
                      onMouseLeave={() => setHoveredImage(null)}
                      onError={(e) => {
                        console.error(`❌ Error cargando imagen ${idx + 1}:`, preview.preview);
                        setImageErrors(prev => ({ ...prev, [idx]: true }));
                        // Intentar recrear el blob URL si falla
                        try {
                          URL.revokeObjectURL(preview.preview);
                          const newUrl = URL.createObjectURL(preview.file);
                          setImagePreviews(prev => {
                            const updated = [...prev];
                            updated[idx] = { ...updated[idx], preview: newUrl };
                            return updated;
                          });
                          // Intentar recargar después de un momento
                          setTimeout(() => {
                            const target = e.target as HTMLImageElement;
                            target.src = newUrl;
                          }, 100);
                        } catch (error) {
                          console.error('❌ No se pudo recrear el blob URL:', error);
                        }
                      }}
                      onLoad={() => {
                        // Si la imagen carga correctamente, eliminar el error
                        if (imageErrors[idx]) {
                          setImageErrors(prev => {
                            const updated = { ...prev };
                            delete updated[idx];
                            return updated;
                          });
                        }
                      }}
                    />
                  )}
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
