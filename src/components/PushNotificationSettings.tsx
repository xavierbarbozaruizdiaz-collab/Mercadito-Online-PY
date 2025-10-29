// src/components/PushNotificationSettings.tsx
// Componente para configurar notificaciones push

'use client';

import { usePushNotifications } from '@/lib/hooks/usePushNotifications';
import Button from './ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { Bell, BellOff, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import LoadingSpinner from './ui/LoadingSpinner';

export default function PushNotificationSettings() {
  const {
    isSupported,
    isSubscribed,
    permission,
    subscribe,
    unsubscribe,
    loading,
  } = usePushNotifications();

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Notificaciones Push</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start">
            <AlertCircle className="w-4 h-4 text-yellow-600 mr-2 mt-0.5" />
            <p className="text-sm text-yellow-800">
              Tu navegador no soporta notificaciones push. Por favor, usa un
              navegador moderno como Chrome, Firefox o Edge.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getPermissionStatus = () => {
    switch (permission) {
      case 'granted':
        return (
          <div className="flex items-center text-green-600">
            <CheckCircle className="w-4 h-4 mr-2" />
            <span>Permisos otorgados</span>
          </div>
        );
      case 'denied':
        return (
          <div className="flex items-center text-red-600">
            <XCircle className="w-4 h-4 mr-2" />
            <span>Permisos denegados. Por favor, habilita las notificaciones en la configuración del navegador.</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center text-yellow-600">
            <AlertCircle className="w-4 h-4 mr-2" />
            <span>Permisos pendientes</span>
          </div>
        );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Bell className="w-5 h-5 mr-2" />
          Notificaciones Push
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {getPermissionStatus()}

        <p className="text-sm text-gray-600">
          Recibe notificaciones cuando tengas nuevos mensajes, actualizaciones de
          pedidos, o promociones especiales.
        </p>

        {permission === 'granted' && (
          <div className="space-y-2">
            {isSubscribed ? (
              <>
                <div className="flex items-center text-green-600">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  <span>Estás suscrito a las notificaciones push</span>
                </div>
                <Button
                  onClick={unsubscribe}
                  disabled={loading}
                  variant="outline"
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Desuscibiendo...
                    </>
                  ) : (
                    <>
                      <BellOff className="w-4 h-4 mr-2" />
                      Desactivar Notificaciones
                    </>
                  )}
                </Button>
              </>
            ) : (
              <Button
                onClick={subscribe}
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Suscribiendo...
                  </>
                ) : (
                  <>
                    <Bell className="w-4 h-4 mr-2" />
                    Activar Notificaciones
                  </>
                )}
              </Button>
            )}
          </div>
        )}

        {permission === 'denied' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">
              Para recibir notificaciones, por favor:
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>Abre la configuración de tu navegador</li>
                <li>Ve a Privacidad y seguridad → Configuración de sitio</li>
                <li>Busca notificaciones y permite este sitio</li>
                <li>Recarga la página</li>
              </ol>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

