// ============================================
// MERCADITO ONLINE PY - PRODUCT FORM COMPONENT
// Componente para crear y editar productos
// ============================================

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  productSchema, 
  CreateProductFormData, 
  UpdateProductFormData 
} from '@/lib/utils/validations';
import { productService } from '@/lib/services/productService';
import { useAuth, useStore } from '@/lib/hooks/useAuth';
import { supabase } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { 
  Upload, 
  X, 
  Plus, 
  Trash2, 
  Save, 
  ArrowLeft,
  Package,
  Tag,
  DollarSign,
  Hash,
  Weight,
  Ruler,
  Eye,
  Search
} from 'lucide-react';

// ============================================
// TIPOS
// ============================================

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface ProductFormProps {
  productId?: string;
  mode: 'create' | 'edit';
}

interface ImagePreview {
  id: string;
  file: File;
  url: string;
  isCover: boolean;
}

interface VariantForm {
  title: string;
  sku?: string;
  price?: number;
  compare_price?: number;
  stock_quantity: number;
  attributes: Record<string, string>;
  image_url?: string;
  is_default: boolean;
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function ProductForm({ productId, mode }: ProductFormProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { store } = useStore();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [imagePreviews, setImagePreviews] = useState<ImagePreview[]>([]);
  const [variants, setVariants] = useState<VariantForm[]>([]);
  const [showVariants, setShowVariants] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<CreateProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      condition: 'new',
      sale_type: 'fixed',
      stock_quantity: 0,
      tags: [],
      is_featured: false,
    },
  });

  const watchedValues = watch();

  // Cargar categorías
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('id, name, slug')
          .eq('is_active', true)
          .order('name');

        if (error) throw error;
        setCategories(data || []);
      } catch (err) {
        console.error('Error loading categories:', err);
      }
    };

    loadCategories();
  }, []);

  // Cargar producto para edición
  useEffect(() => {
    if (mode === 'edit' && productId) {
      const loadProduct = async () => {
        try {
          setLoading(true);
          const product = await productService.getProduct(productId);
          
          if (product) {
            reset({
              title: product.title,
              description: product.description,
              price: product.price,
              compare_price: product.compare_price,
              sku: product.sku,
              barcode: product.barcode,
              category_id: product.category_id,
              condition: product.condition,
              sale_type: product.sale_type,
              stock_quantity: product.stock_quantity,
              weight: product.weight,
              dimensions: product.dimensions,
              tags: product.tags,
              seo_title: product.seo_title,
              seo_description: product.seo_description,
              is_featured: product.is_featured,
            });

            // Cargar variantes
            if (product.variants) {
              setVariants(product.variants.map(v => ({
                title: v.title,
                sku: v.sku,
                price: v.price,
                compare_price: v.compare_price,
                stock_quantity: v.stock_quantity,
                attributes: v.attributes,
                image_url: v.image_url,
                is_default: v.is_default,
              })));
              setShowVariants(product.variants.length > 0);
            }
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Error al cargar producto');
        } finally {
          setLoading(false);
        }
      };

      loadProduct();
    }
  }, [mode, productId, reset]);

  // Manejar envío del formulario
  const onSubmit = async (data: CreateProductFormData) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      if (!store) {
        throw new Error('No se encontró la tienda del usuario');
      }

      // Preparar datos del producto
      const productData = {
        ...data,
        images: imagePreviews.map(img => img.file),
        variants: variants,
      };

      if (mode === 'create') {
        await productService.createProduct(productData);
        setSuccess('Producto creado exitosamente');
      } else if (mode === 'edit' && productId) {
        await productService.updateProduct(productId, productData);
        setSuccess('Producto actualizado exitosamente');
      }

      // Redirigir después de un breve delay
      setTimeout(() => {
        router.push('/dashboard/seller/products');
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar producto');
    } finally {
      setLoading(false);
    }
  };

  // Manejar subida de imágenes
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    files.forEach((file) => {
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        const newImage: ImagePreview = {
          id: Date.now().toString(),
          file,
          url,
          isCover: imagePreviews.length === 0, // La primera imagen es portada
        };
        
        setImagePreviews(prev => [...prev, newImage]);
      }
    });
  };

  // Eliminar imagen
  const removeImage = (imageId: string) => {
    setImagePreviews(prev => {
      const updated = prev.filter(img => img.id !== imageId);
      // Si eliminamos la imagen de portada, hacer la primera imagen restante como portada
      if (updated.length > 0 && !updated.some(img => img.isCover)) {
        updated[0].isCover = true;
      }
      return updated;
    });
  };

  // Establecer imagen como portada
  const setCoverImage = (imageId: string) => {
    setImagePreviews(prev => 
      prev.map(img => ({
        ...img,
        isCover: img.id === imageId,
      }))
    );
  };

  // Agregar variante
  const addVariant = () => {
    setVariants(prev => [...prev, {
      title: '',
      sku: '',
      price: 0,
      compare_price: 0,
      stock_quantity: 0,
      attributes: {},
      image_url: '',
      is_default: false,
    }]);
  };

  // Eliminar variante
  const removeVariant = (index: number) => {
    setVariants(prev => prev.filter((_, i) => i !== index));
  };

  // Actualizar variante
  const updateVariant = (index: number, field: keyof VariantForm, value: any) => {
    setVariants(prev => 
      prev.map((variant, i) => 
        i === index ? { ...variant, [field]: value } : variant
      )
    );
  };

  // Agregar atributo a variante
  const addVariantAttribute = (index: number) => {
    const key = prompt('Nombre del atributo (ej: Color, Talla):');
    const value = prompt('Valor del atributo (ej: Rojo, M):');
    
    if (key && value) {
      updateVariant(index, 'attributes', {
        ...variants[index].attributes,
        [key]: value,
      });
    }
  };

  if (loading && mode === 'edit') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando producto...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center">
              <button
                onClick={() => router.back()}
                className="mr-4 p-2 text-gray-400 hover:text-gray-600"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {mode === 'create' ? 'Nuevo Producto' : 'Editar Producto'}
                </h1>
                <p className="text-gray-600">
                  {mode === 'create' ? 'Crea un nuevo producto para tu tienda' : 'Modifica los datos del producto'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleSubmit(onSubmit)}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4 mr-2" />
                {loading ? 'Guardando...' : 'Guardar Producto'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Mensajes */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
            <p className="text-sm text-green-600">{success}</p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Información Básica */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Package className="w-5 h-5 mr-2" />
                Información Básica
              </h2>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                    Título del Producto *
                  </label>
                  <input
                    {...register('title')}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ej: iPhone 15 Pro Max"
                  />
                  {errors.title && (
                    <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="category_id" className="block text-sm font-medium text-gray-700 mb-2">
                    Categoría
                  </label>
                  <select
                    {...register('category_id')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Seleccionar categoría</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  {errors.category_id && (
                    <p className="mt-1 text-sm text-red-600">{errors.category_id.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción
                </label>
                <textarea
                  {...register('description')}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Describe tu producto en detalle..."
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label htmlFor="condition" className="block text-sm font-medium text-gray-700 mb-2">
                    Condición *
                  </label>
                  <select
                    {...register('condition')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="new">Nuevo</option>
                    <option value="like_new">Como nuevo</option>
                    <option value="used">Usado</option>
                    <option value="refurbished">Reacondicionado</option>
                  </select>
                  {errors.condition && (
                    <p className="mt-1 text-sm text-red-600">{errors.condition.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="sale_type" className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Venta *
                  </label>
                  <select
                    {...register('sale_type')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="fixed">Precio fijo</option>
                    <option value="auction">Subasta</option>
                    <option value="negotiable">Negociable</option>
                  </select>
                  {errors.sale_type && (
                    <p className="mt-1 text-sm text-red-600">{errors.sale_type.message}</p>
                  )}
                </div>

                <div className="flex items-center">
                  <input
                    {...register('is_featured')}
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="is_featured" className="ml-2 block text-sm text-gray-700">
                    Producto destacado
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Precios y Stock */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <DollarSign className="w-5 h-5 mr-2" />
                Precios y Stock
              </h2>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-2">
                    Precio *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500">Gs.</span>
                    <input
                      {...register('price', { valueAsNumber: true })}
                      type="number"
                      step="0.01"
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0"
                    />
                  </div>
                  {errors.price && (
                    <p className="mt-1 text-sm text-red-600">{errors.price.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="compare_price" className="block text-sm font-medium text-gray-700 mb-2">
                    Precio de Comparación
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500">Gs.</span>
                    <input
                      {...register('compare_price', { valueAsNumber: true })}
                      type="number"
                      step="0.01"
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0"
                    />
                  </div>
                  {errors.compare_price && (
                    <p className="mt-1 text-sm text-red-600">{errors.compare_price.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="stock_quantity" className="block text-sm font-medium text-gray-700 mb-2">
                    Cantidad en Stock *
                  </label>
                  <input
                    {...register('stock_quantity', { valueAsNumber: true })}
                    type="number"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0"
                  />
                  {errors.stock_quantity && (
                    <p className="mt-1 text-sm text-red-600">{errors.stock_quantity.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="sku" className="block text-sm font-medium text-gray-700 mb-2">
                    SKU
                  </label>
                  <input
                    {...register('sku')}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="SKU-001"
                  />
                  {errors.sku && (
                    <p className="mt-1 text-sm text-red-600">{errors.sku.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="barcode" className="block text-sm font-medium text-gray-700 mb-2">
                    Código de Barras
                  </label>
                  <input
                    {...register('barcode')}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="1234567890123"
                  />
                  {errors.barcode && (
                    <p className="mt-1 text-sm text-red-600">{errors.barcode.message}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Imágenes */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Upload className="w-5 h-5 mr-2" />
                Imágenes del Producto
              </h2>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <label htmlFor="images" className="block text-sm font-medium text-gray-700 mb-2">
                  Subir Imágenes
                </label>
                <input
                  id="images"
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Máximo 10 imágenes. La primera imagen será la portada.
                </p>
              </div>

              {imagePreviews.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {imagePreviews.map((image) => (
                    <div key={image.id} className="relative group">
                      <img
                        src={image.url}
                        alt="Preview"
                        className="w-full h-32 object-cover rounded-md"
                      />
                      {image.isCover && (
                        <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                          Portada
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-md flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 flex space-x-2">
                          {!image.isCover && (
                            <button
                              type="button"
                              onClick={() => setCoverImage(image.id)}
                              className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                              title="Establecer como portada"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => removeImage(image.id)}
                            className="p-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                            title="Eliminar imagen"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Variantes */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Tag className="w-5 h-5 mr-2" />
                  Variantes del Producto
                </h2>
                <button
                  type="button"
                  onClick={() => setShowVariants(!showVariants)}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  {showVariants ? 'Ocultar' : 'Mostrar'} Variantes
                </button>
              </div>
            </div>
            
            {showVariants && (
              <div className="p-6">
                <div className="mb-4">
                  <button
                    type="button"
                    onClick={addVariant}
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar Variante
                  </button>
                </div>

                {variants.map((variant, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-medium text-gray-900">
                        Variante {index + 1}
                      </h3>
                      <button
                        type="button"
                        onClick={() => removeVariant(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Título
                        </label>
                        <input
                          type="text"
                          value={variant.title}
                          onChange={(e) => updateVariant(index, 'title', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Ej: Rojo, Talla M"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          SKU
                        </label>
                        <input
                          type="text"
                          value={variant.sku}
                          onChange={(e) => updateVariant(index, 'sku', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          placeholder="SKU-001-RED-M"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Cantidad
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={variant.stock_quantity}
                          onChange={(e) => updateVariant(index, 'stock_quantity', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Atributos
                        </label>
                        <button
                          type="button"
                          onClick={() => addVariantAttribute(index)}
                          className="text-blue-600 hover:text-blue-700 text-sm"
                        >
                          + Agregar Atributo
                        </button>
                      </div>
                      <div className="space-y-2">
                        {Object.entries(variant.attributes).map(([key, value]) => (
                          <div key={key} className="flex items-center space-x-2">
                            <span className="text-sm text-gray-600">{key}:</span>
                            <span className="text-sm font-medium text-gray-900">{value}</span>
                            <button
                              type="button"
                              onClick={() => {
                                const newAttributes = { ...variant.attributes };
                                delete newAttributes[key];
                                updateVariant(index, 'attributes', newAttributes);
                              }}
                              className="text-red-600 hover:text-red-700"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SEO */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Search className="w-5 h-5 mr-2" />
                SEO y Metadatos
              </h2>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label htmlFor="seo_title" className="block text-sm font-medium text-gray-700 mb-2">
                  Título SEO
                </label>
                <input
                  {...register('seo_title')}
                  type="text"
                  maxLength={60}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Título optimizado para buscadores"
                />
                <p className="mt-1 text-sm text-gray-500">
                  {watchedValues.seo_title?.length || 0}/60 caracteres
                </p>
                {errors.seo_title && (
                  <p className="mt-1 text-sm text-red-600">{errors.seo_title.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="seo_description" className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción SEO
                </label>
                <textarea
                  {...register('seo_description')}
                  rows={3}
                  maxLength={160}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Descripción optimizada para buscadores"
                />
                <p className="mt-1 text-sm text-gray-500">
                  {watchedValues.seo_description?.length || 0}/160 caracteres
                </p>
                {errors.seo_description && (
                  <p className="mt-1 text-sm text-red-600">{errors.seo_description.message}</p>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
