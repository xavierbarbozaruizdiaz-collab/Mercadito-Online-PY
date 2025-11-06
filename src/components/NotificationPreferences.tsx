// src/components/NotificationPreferences.tsx
// Componente para gestionar preferencias de notificaciones

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { NotificationService, NotificationPreferences } from '@/lib/services/notificationService';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import Button from './ui/Button';
import LoadingSpinner from './ui/LoadingSpinner';
import { Bell, Mail, Smartphone, Clock, Settings } from 'lucide-react';

export default function NotificationPreferencesPanel() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadPreferences();
  }, [user]);

  const loadPreferences = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const prefs = await NotificationService.getNotificationPreferences(user.id);
      setPreferences(prefs);
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (updates: Partial<NotificationPreferences>) => {
    if (!user || !preferences) return;

    setSaving(true);
    try {
      const updated = await NotificationService.updateNotificationPreferences(user.id, {
        ...preferences,
        ...updates,
      });
      setPreferences(updated);
    } catch (error) {
      console.error('Error updating preferences:', error);
      alert('Error al actualizar las preferencias');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (!preferences) {
    return <div className="text-center p-8 text-gray-500">No se pudieron cargar las preferencias</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Preferencias de Notificaciones
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Métodos de entrega */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Métodos de Entrega
            </h3>
            <div className="space-y-3">
              <ToggleOption
                label="Notificaciones en la aplicación"
                description="Recibir notificaciones dentro de la plataforma"
                checked={preferences.push_enabled}
                onChange={(checked) => handleUpdate({ push_enabled: checked })}
                icon={<Bell className="w-4 h-4" />}
              />
              <ToggleOption
                label="Notificaciones por email"
                description="Recibir notificaciones por correo electrónico"
                checked={preferences.email_enabled}
                onChange={(checked) => handleUpdate({ email_enabled: checked })}
                icon={<Mail className="w-4 h-4" />}
              />
              <ToggleOption
                label="Notificaciones por SMS"
                description="Recibir notificaciones por mensaje de texto"
                checked={preferences.sms_enabled}
                onChange={(checked) => handleUpdate({ sms_enabled: checked })}
                icon={<Smartphone className="w-4 h-4" />}
              />
            </div>
          </div>

          {/* Preferencias por categoría */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Tipos de Notificaciones</h3>
            <div className="space-y-3">
              <ToggleOption
                label="Notificaciones de Pedidos"
                description="Nuevos pedidos, cambios de estado, entregas"
                checked={preferences.order_notifications}
                onChange={(checked) => handleUpdate({ order_notifications: checked })}
              />
              <ToggleOption
                label="Notificaciones de Mensajes"
                description="Nuevos mensajes en conversaciones"
                checked={preferences.message_notifications}
                onChange={(checked) => handleUpdate({ message_notifications: checked })}
              />
              <ToggleOption
                label="Notificaciones de Reseñas"
                description="Nuevas reseñas de productos"
                checked={preferences.review_notifications}
                onChange={(checked) => handleUpdate({ review_notifications: checked })}
              />
              <ToggleOption
                label="Notificaciones Promocionales"
                description="Ofertas, descuentos y promociones"
                checked={preferences.promotion_notifications}
                onChange={(checked) => handleUpdate({ promotion_notifications: checked })}
              />
              <ToggleOption
                label="Notificaciones del Sistema"
                description="Actualizaciones y anuncios importantes"
                checked={preferences.system_notifications}
                onChange={(checked) => handleUpdate({ system_notifications: checked })}
              />
            </div>
          </div>

          {/* Horas silenciosas */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Horas Silenciosas
            </h3>
            <div className="space-y-4">
              <ToggleOption
                label="Activar horas silenciosas"
                description="No recibir notificaciones durante estas horas"
                checked={preferences.quiet_hours_enabled}
                onChange={(checked) => handleUpdate({ quiet_hours_enabled: checked })}
              />
              
              {preferences.quiet_hours_enabled && (
                <div className="grid grid-cols-2 gap-4 ml-8">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hora de inicio
                    </label>
                    <input
                      type="time"
                      value={preferences.quiet_hours_start}
                      onChange={(e) => handleUpdate({ quiet_hours_start: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hora de fin
                    </label>
                    <input
                      type="time"
                      value={preferences.quiet_hours_end}
                      onChange={(e) => handleUpdate({ quiet_hours_end: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface ToggleOptionProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  icon?: React.ReactNode;
}

function ToggleOption({ label, description, checked, onChange, icon }: ToggleOptionProps) {
  return (
    <div className="flex items-start justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          {icon}
          <label className="font-medium text-gray-900 cursor-pointer" onClick={() => onChange(!checked)}>
            {label}
          </label>
        </div>
        <p className="text-sm text-gray-500 ml-6">{description}</p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
      </label>
    </div>
  );
}

