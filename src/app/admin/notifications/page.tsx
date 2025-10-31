'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
  sendBulkNotification,
  getBulkNotificationHistory,
  getBulkNotificationStats,
  type BulkNotificationInput,
  type NotificationRecipient,
  type NotificationChannel,
  type BulkNotificationResult,
} from '@/lib/services/bulkNotificationService';

export default function AdminNotificationsPage() {
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [result, setResult] = useState<BulkNotificationResult | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [formData, setFormData] = useState<BulkNotificationInput>({
    title: '',
    message: '',
    type: 'announcement',
    priority: 'normal',
    action_url: '',
    expires_at: '',
    recipient_type: 'all',
    recipient_ids: [],
    channels: ['in_app'],
    scheduled_at: '',
    send_immediately: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [historyData, statsData] = await Promise.all([
        getBulkNotificationHistory(),
        getBulkNotificationStats(),
      ]);
      setHistory(historyData);
      setStats(statsData);
    } catch (error: any) {
      console.error('Error loading data:', error);
    } finally {
      setLoadingStats(false);
    }
  }

  async function handleSend() {
    if (!formData.title.trim() || !formData.message.trim()) {
      alert('El título y mensaje son requeridos');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const result = await sendBulkNotification(formData);
      setResult(result);
      alert(`✅ Notificación enviada a ${result.success_count} usuarios`);
      
      // Limpiar formulario
      setFormData({
        title: '',
        message: '',
        type: 'announcement',
        priority: 'normal',
        action_url: '',
        expires_at: '',
        recipient_type: 'all',
        recipient_ids: [],
        channels: ['in_app'],
        scheduled_at: '',
        send_immediately: true,
      });
      setShowForm(false);
      await loadData();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Notificaciones Masivas</h1>
            <p className="text-gray-600 mt-2">Enviar notificaciones a usuarios o grupos específicos</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Nueva Notificación</span>
          </button>
        </div>

        {/* Estadísticas */}
        {stats && !loadingStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="text-sm text-gray-600 mb-1">Total Enviadas</div>
              <div className="text-2xl font-bold text-gray-900">{stats.total_sent}</div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="text-sm text-gray-600 mb-1">Total Destinatarios</div>
              <div className="text-2xl font-bold text-gray-900">{stats.total_recipients.toLocaleString()}</div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="text-sm text-gray-600 mb-1">Últimos 30 días</div>
              <div className="text-2xl font-bold text-gray-900">{stats.recent_count}</div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="text-sm text-gray-600 mb-1">Tipos</div>
              <div className="text-xs text-gray-500">
                {Object.entries(stats.by_type).map(([type, count]: [string, any]) => (
                  <div key={type}>{type}: {count}</div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Resultado del envío */}
        {result && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-green-800 mb-2">✅ Notificación Enviada</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Destinatarios:</span>
                <span className="font-medium ml-2">{result.total_recipients}</span>
              </div>
              <div>
                <span className="text-gray-600">Exitosos:</span>
                <span className="font-medium text-green-600 ml-2">{result.success_count}</span>
              </div>
              <div>
                <span className="text-gray-600">Fallidos:</span>
                <span className="font-medium text-red-600 ml-2">{result.failed_count}</span>
              </div>
            </div>
          </div>
        )}

        {/* Formulario de notificación */}
        {showForm && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Crear Notificación Masiva</h2>

            <div className="space-y-4">
              {/* Tipo y prioridad */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="announcement">Anuncio General</option>
                    <option value="promotion">Promoción/Oferta</option>
                    <option value="system">Sistema/Mantenimiento</option>
                    <option value="urgent">Urgente</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prioridad</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="low">Baja</option>
                    <option value="normal">Normal</option>
                    <option value="high">Alta</option>
                    <option value="urgent">Urgente</option>
                  </select>
                </div>
              </div>

              {/* Título y mensaje */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ej: ¡Nueva promoción especial!"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mensaje</label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows={5}
                  placeholder="Escribe el contenido de la notificación..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              {/* Destinatarios */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Destinatarios</label>
                <select
                  value={formData.recipient_type}
                  onChange={(e) => setFormData({ ...formData, recipient_type: e.target.value as NotificationRecipient })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="all">Todos los usuarios</option>
                  <option value="buyers">Solo compradores</option>
                  <option value="sellers">Solo vendedores</option>
                  <option value="admins">Solo administradores</option>
                  <option value="custom">Lista personalizada (por implementar)</option>
                </select>
                {formData.recipient_type === 'custom' && (
                  <p className="text-xs text-gray-500 mt-1">Funcionalidad por implementar</p>
                )}
              </div>

              {/* Canales */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Canales de envío</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.channels.includes('in_app')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            channels: [...formData.channels, 'in_app'],
                          });
                        } else {
                          setFormData({
                            ...formData,
                            channels: formData.channels.filter((c) => c !== 'in_app'),
                          });
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                    <span>In-app (notificaciones en la plataforma) ✓</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.channels.includes('email')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            channels: [...formData.channels, 'email'],
                          });
                        } else {
                          setFormData({
                            ...formData,
                            channels: formData.channels.filter((c) => c !== 'email'),
                          });
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                    <span>Email (requiere configuración de servicio de email)</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.channels.includes('push')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            channels: [...formData.channels, 'push'],
                          });
                        } else {
                          setFormData({
                            ...formData,
                            channels: formData.channels.filter((c) => c !== 'push'),
                          });
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                    <span>Push (notificaciones del navegador)</span>
                  </label>
                </div>
              </div>

              {/* URL de acción opcional */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL de acción (opcional)
                </label>
                <input
                  type="url"
                  value={formData.action_url}
                  onChange={(e) => setFormData({ ...formData, action_url: e.target.value })}
                  placeholder="https://mercadito-py.com/promo-especial"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Los usuarios pueden hacer clic para ir a esta URL
                </p>
              </div>

              {/* Programación */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="send_immediately"
                  checked={formData.send_immediately}
                  onChange={(e) => setFormData({ ...formData, send_immediately: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <label htmlFor="send_immediately" className="text-sm font-medium text-gray-700">
                  Enviar inmediatamente
                </label>
              </div>

              {!formData.send_immediately && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Programar para (fecha y hora)
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.scheduled_at}
                    onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    La notificación se enviará en la fecha y hora programada (requiere implementación de cron job)
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSend}
                disabled={loading || !formData.title.trim() || !formData.message.trim() || formData.channels.length === 0}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Enviando...' : 'Enviar Notificación'}
              </button>
              <button
                onClick={() => {
                  setShowForm(false);
                  setResult(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Historial */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="p-4 border-b bg-gray-50">
            <h2 className="text-lg font-semibold">Historial de Notificaciones Masivas</h2>
          </div>
          <div className="divide-y">
            {history.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No hay notificaciones masivas enviadas
              </div>
            ) : (
              history.map((item) => (
                <div key={item.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{item.title}</div>
                      <div className="text-sm text-gray-500 mt-1">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs mr-2">
                          {item.type}
                        </span>
                        {item.recipient_count} destinatarios • {item.success_count} exitosos
                        {item.failed_count > 0 && (
                          <span className="text-red-600 ml-2">• {item.failed_count} fallidos</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        Canales: {item.channels?.join(', ') || 'in_app'} • Por: {item.sent_by}
                      </div>
                    </div>
                    <div className="text-sm text-gray-500 ml-4">
                      {new Date(item.sent_at).toLocaleDateString('es-PY', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

