'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getAllSettings, updateSettings } from '@/lib/services/siteSettingsService';

export default function SiteSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [formData, setFormData] = useState({
    site_name: '',
    site_description: '',
    primary_color: '#3b82f6',
    secondary_color: '#8b5cf6',
    contact_email: '',
    contact_phone: '',
    shipping_cost: '0',
    free_shipping_threshold: '0',
    payment_methods: [] as string[],
    bank_account_number: '',
    bank_name: '',
    bank_account_holder: '',
    whatsapp_number: '',
  });

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    try {
      const allSettings = await getAllSettings();
      setSettings(allSettings);

      // Asegurar que los valores sean strings simples, no objetos JSON
      const cleanValue = (val: any): string => {
        if (val == null) return '';
        if (typeof val === 'string') {
          // Limpiar comillas escapadas primero
          let cleaned = val.replace(/^\\?"|\\?"$/g, '').replace(/^"|"$/g, '');
          
          // Si después de limpiar comillas todavía tiene comillas escapadas, limpiar más
          if (cleaned.startsWith('\\"') && cleaned.endsWith('\\"')) {
            cleaned = cleaned.replace(/^\\?"|\\?"$/g, '');
          }
          
          // Intentar parsear si parece JSON
          if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
            try {
              return JSON.parse(cleaned);
            } catch {
              return cleaned.replace(/^"|"$/g, '');
            }
          }
          
          return cleaned;
        }
        return String(val);
      };

      setFormData({
        site_name: cleanValue(allSettings.site_name) || 'Mercadito Online PY',
        site_description: cleanValue(allSettings.site_description) || '',
        primary_color: cleanValue(allSettings.primary_color) || '#3b82f6',
        secondary_color: cleanValue(allSettings.secondary_color) || '#8b5cf6',
        contact_email: cleanValue(allSettings.contact_email) || '',
        contact_phone: cleanValue(allSettings.contact_phone) || '',
        shipping_cost: String(allSettings.shipping_cost || 0),
        free_shipping_threshold: String(allSettings.free_shipping_threshold || 0),
        payment_methods: Array.isArray(allSettings.payment_methods) 
          ? allSettings.payment_methods 
          : ['cash', 'transfer'],
        bank_account_number: cleanValue(allSettings.bank_account_number) || '',
        bank_name: cleanValue(allSettings.bank_name) || '',
        bank_account_holder: cleanValue(allSettings.bank_account_holder) || '',
        whatsapp_number: cleanValue(allSettings.whatsapp_number) || '',
      });
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No autenticado');

      await updateSettings({
        site_name: formData.site_name,
        site_description: formData.site_description,
        primary_color: formData.primary_color,
        secondary_color: formData.secondary_color,
        contact_email: formData.contact_email,
        contact_phone: formData.contact_phone,
        shipping_cost: parseFloat(formData.shipping_cost) || 0,
        free_shipping_threshold: parseFloat(formData.free_shipping_threshold) || 0,
        payment_methods: formData.payment_methods,
        bank_account_number: formData.bank_account_number,
        bank_name: formData.bank_name,
        bank_account_holder: formData.bank_account_holder,
        whatsapp_number: formData.whatsapp_number,
      }, user.id);

      alert('✅ Configuración guardada exitosamente');
      await loadSettings();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-4 sm:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando configuración...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Configuración del Sitio</h1>
          <p className="text-gray-600 mt-2">Ajustes generales del marketplace</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6 space-y-6">
          {/* Información General */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Información General</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Sitio</label>
                <input
                  type="text"
                  value={formData.site_name}
                  onChange={(e) => setFormData({ ...formData, site_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción del Sitio
                  <span className="text-xs text-gray-500 ml-2">(máx. 400 caracteres, para SEO)</span>
                </label>
                <textarea
                  value={formData.site_description}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value.length <= 400) {
                      setFormData({ ...formData, site_description: value });
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={3}
                  maxLength={400}
                  placeholder="El mejor marketplace de Paraguay. Compra y vende productos nuevos y usados de forma segura."
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formData.site_description.length}/400 caracteres
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Color Primario</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={formData.primary_color}
                      onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                      className="h-10 w-20 border border-gray-300 rounded"
                    />
                    <input
                      type="text"
                      value={formData.primary_color}
                      onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="#3b82f6"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Color Secundario</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={formData.secondary_color}
                      onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                      className="h-10 w-20 border border-gray-300 rounded"
                    />
                    <input
                      type="text"
                      value={formData.secondary_color}
                      onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="#8b5cf6"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Información de Contacto */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Información de Contacto</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email de Contacto</label>
                <input
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono de Contacto</label>
                <input
                  type="text"
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="+595123456789"
                />
              </div>
            </div>
          </div>

          {/* Configuración de Envíos */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Configuración de Envíos</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Costo de Envío (₲)</label>
                <input
                  type="number"
                  value={formData.shipping_cost}
                  onChange={(e) => setFormData({ ...formData, shipping_cost: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Umbral Envío Gratis (₲)</label>
                <input
                  type="number"
                  value={formData.free_shipping_threshold}
                  onChange={(e) => setFormData({ ...formData, free_shipping_threshold: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  min="0"
                  placeholder="0 = sin envío gratis"
                />
              </div>
            </div>
          </div>

          {/* Métodos de Pago */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Métodos de Pago Disponibles</h2>
            <div className="space-y-2">
              {['cash', 'transfer', 'card', 'pagopar'].map((method) => (
                <label key={method} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.payment_methods.includes(method)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({
                          ...formData,
                          payment_methods: [...formData.payment_methods, method],
                        });
                      } else {
                        setFormData({
                          ...formData,
                          payment_methods: formData.payment_methods.filter((m) => m !== method),
                        });
                      }
                    }}
                    className="rounded border-gray-300"
                  />
                  <span className="capitalize">
                    {method === 'cash' ? 'Efectivo' 
                     : method === 'transfer' ? 'Transferencia' 
                     : method === 'card' ? 'Tarjeta'
                     : method === 'pagopar' ? 'Pagopar'
                     : method}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Configuración de Transferencia Bancaria */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Configuración de Transferencia Bancaria</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Número de Cuenta</label>
                <input
                  type="text"
                  value={formData.bank_account_number}
                  onChange={(e) => setFormData({ ...formData, bank_account_number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="1234567890"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Banco</label>
                <input
                  type="text"
                  value={formData.bank_name}
                  onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Banco Nacional"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Titular de la Cuenta</label>
                <input
                  type="text"
                  value={formData.bank_account_holder}
                  onChange={(e) => setFormData({ ...formData, bank_account_holder: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Nombre del titular"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Número de WhatsApp para Comprobantes</label>
                <input
                  type="text"
                  value={formData.whatsapp_number}
                  onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="595123456789"
                />
                <p className="text-xs text-gray-500 mt-1">Solo números, sin + ni espacios</p>
              </div>
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Guardar Cambios</span>
                </>
              )}
            </button>
            <button
              onClick={loadSettings}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

