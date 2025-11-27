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
    primary_color: '#3b82f6',
    secondary_color: '#8b5cf6',
    contact_email: '',
    contact_phone: '',
    shipping_cost: '0',
    free_shipping_threshold: '0',
    payment_methods: [] as string[],
  });

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    try {
      const allSettings = await getAllSettings();
      setSettings(allSettings);

      setFormData({
        site_name: allSettings.site_name || 'Mercadito Online PY',
        primary_color: allSettings.primary_color || '#3b82f6',
        secondary_color: allSettings.secondary_color || '#8b5cf6',
        contact_email: allSettings.contact_email || '',
        contact_phone: allSettings.contact_phone || '',
        shipping_cost: String(allSettings.shipping_cost || 0),
        free_shipping_threshold: String(allSettings.free_shipping_threshold || 0),
        payment_methods: allSettings.payment_methods || ['cash', 'transfer'],
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
        primary_color: formData.primary_color,
        secondary_color: formData.secondary_color,
        contact_email: formData.contact_email,
        contact_phone: formData.contact_phone,
        shipping_cost: parseFloat(formData.shipping_cost) || 0,
        free_shipping_threshold: parseFloat(formData.free_shipping_threshold) || 0,
        payment_methods: formData.payment_methods,
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

