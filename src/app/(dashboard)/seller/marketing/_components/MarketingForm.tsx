'use client';

// ============================================
// MARKETING FORM COMPONENT
// Formulario para configurar IDs de marketing
// ============================================

import { useState } from 'react';
import { MarketingIntegrationsSchema } from '@/lib/marketing/schema';
import { useToast } from '@/lib/hooks/useToast';
import { Save, AlertCircle, CheckCircle } from 'lucide-react';

interface MarketingFormProps {
  storeId: string;
  storeName: string;
  initialData: {
    fb_pixel_id: string;
    ga_measurement_id: string;
    gtm_id: string;
  };
}

export default function MarketingForm({ storeId, storeName, initialData }: MarketingFormProps) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      // Validar client-side con Zod
      const validated = MarketingIntegrationsSchema.parse(formData);

      // Llamar a la API
      const response = await fetch(`/api/stores/${storeId}/marketing`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validated),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al guardar');
      }

      toast.success('Configuración de marketing guardada exitosamente');
      
      // Actualizar initialData para reflejar cambios
      Object.assign(initialData, validated);
    } catch (error: any) {
      if (error.errors) {
        // Errores de validación Zod
        const zodErrors: Record<string, string> = {};
        error.errors.forEach((err: any) => {
          if (err.path) {
            zodErrors[err.path[0]] = err.message;
          }
        });
        setErrors(zodErrors);
      } else {
        toast.error(error.message || 'Error al guardar la configuración');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Limpiar error del campo cuando el usuario empieza a escribir
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Facebook Pixel ID */}
        <div>
          <label htmlFor="fb_pixel_id" className="block text-sm font-medium text-gray-700 mb-2">
            Facebook Pixel ID
          </label>
          <input
            type="text"
            id="fb_pixel_id"
            value={formData.fb_pixel_id}
            onChange={(e) => handleChange('fb_pixel_id', e.target.value)}
            placeholder="123456789012345"
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
              errors.fb_pixel_id
                ? 'border-red-300 focus:ring-red-500'
                : 'border-gray-300 focus:ring-blue-500'
            }`}
          />
          {errors.fb_pixel_id && (
            <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.fb_pixel_id}
            </p>
          )}
          <p className="mt-1 text-sm text-gray-500">
            Si dejás vacío, no se inyecta el script de Facebook Pixel para esta tienda (se usará el global si existe).
          </p>
        </div>

        {/* Google Analytics 4 Measurement ID */}
        <div>
          <label htmlFor="ga_measurement_id" className="block text-sm font-medium text-gray-700 mb-2">
            Google Analytics 4 Measurement ID
          </label>
          <input
            type="text"
            id="ga_measurement_id"
            value={formData.ga_measurement_id}
            onChange={(e) => handleChange('ga_measurement_id', e.target.value)}
            placeholder="G-XXXXXXXXXX"
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
              errors.ga_measurement_id
                ? 'border-red-300 focus:ring-red-500'
                : 'border-gray-300 focus:ring-blue-500'
            }`}
          />
          {errors.ga_measurement_id && (
            <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.ga_measurement_id}
            </p>
          )}
          <p className="mt-1 text-sm text-gray-500">
            Formato: G-XXXXXXXXXX. Si dejás vacío, se usará el ID global si existe.
          </p>
        </div>

        {/* Google Tag Manager Container ID */}
        <div>
          <label htmlFor="gtm_id" className="block text-sm font-medium text-gray-700 mb-2">
            Google Tag Manager Container ID
          </label>
          <input
            type="text"
            id="gtm_id"
            value={formData.gtm_id}
            onChange={(e) => handleChange('gtm_id', e.target.value)}
            placeholder="GTM-XXXXXXX"
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
              errors.gtm_id
                ? 'border-red-300 focus:ring-red-500'
                : 'border-gray-300 focus:ring-blue-500'
            }`}
          />
          {errors.gtm_id && (
            <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.gtm_id}
            </p>
          )}
          <p className="mt-1 text-sm text-gray-500">
            Formato: GTM-XXXXXXX. Si dejás vacío, se usará el ID global si existe.
          </p>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Nota importante:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Los IDs de la tienda tienen prioridad sobre los IDs globales.</li>
                <li>Si configurás un ID de tienda, se usará ese; si no, se usará el global.</li>
                <li>Para Facebook Pixel, si configurás un ID de tienda, AMBOS pixels (global + tienda) recibirán eventos.</li>
                <li>Los cambios se aplican inmediatamente en las páginas de tu tienda.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Guardando...' : 'Guardar Configuración'}
          </button>
        </div>
      </form>
    </div>
  );
}

