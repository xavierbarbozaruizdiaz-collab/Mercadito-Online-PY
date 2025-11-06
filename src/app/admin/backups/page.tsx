// ============================================
// MERCADITO ONLINE PY - BACKUP ADMIN INTERFACE
// Interfaz de administración para backups
// ============================================

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Button, Badge, LoadingSpinner, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';

interface BackupLog {
  id: string;
  backup_id: string;
  backup_type: 'full' | 'incremental';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  error_message?: string;
  created_at: string;
  completed_at?: string;
  last_used_at?: string;
  metadata: any;
}

interface BackupStats {
  total_backups: number;
  full_backups: number;
  incremental_backups: number;
  completed_backups: number;
  failed_backups: number;
  last_backup: string;
  oldest_backup: string;
  total_size_mb: number;
}

export default function BackupAdmin() {
  const [backups, setBackups] = useState<BackupLog[]>([]);
  const [stats, setStats] = useState<BackupStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ============================================
  // CARGA DE DATOS
  // ============================================

  useEffect(() => {
    loadBackups();
    loadStats();
  }, []);

  const loadBackups = async () => {
    try {
      const { data, error } = await supabase
        .from('backup_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setBackups(data || []);
    } catch (err) {
      setError('Error cargando backups: ' + (err as Error).message);
    }
  };

  const loadStats = async () => {
    try {
      const { data, error } = await supabase.rpc('get_backup_stats');
      if (error) throw error;
      setStats(data);
    } catch (err) {
      console.error('Error cargando estadísticas:', err);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // ACCIONES DE BACKUP
  // ============================================

  const createFullBackup = async () => {
    setActionLoading('full');
    setError(null);
    setSuccess(null);

    try {
      const { data, error } = await supabase.rpc('create_full_backup');
      if (error) throw error;
      
      setSuccess(`Backup completo creado: ${data}`);
      await loadBackups();
      await loadStats();
    } catch (err) {
      setError('Error creando backup completo: ' + (err as Error).message);
    } finally {
      setActionLoading(null);
    }
  };

  const createIncrementalBackup = async () => {
    setActionLoading('incremental');
    setError(null);
    setSuccess(null);

    try {
      // Crear backup incremental desde hace 24 horas
      const sinceTimestamp = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase.rpc('create_incremental_backup', {
        since_timestamp: sinceTimestamp
      } as any);
      
      if (error) throw error;
      
      setSuccess(`Backup incremental creado: ${data}`);
      await loadBackups();
      await loadStats();
    } catch (err) {
      setError('Error creando backup incremental: ' + (err as Error).message);
    } finally {
      setActionLoading(null);
    }
  };

  const restoreBackup = async (backupId: string) => {
    if (!confirm(`¿Estás seguro de que quieres restaurar desde el backup ${backupId}? Esta acción puede sobrescribir datos existentes.`)) {
      return;
    }

    setActionLoading(`restore-${backupId}`);
    setError(null);
    setSuccess(null);

    try {
      const { data, error } = await supabase.rpc('restore_from_backup', {
        backup_id_param: backupId
      } as any);
      
      if (error) throw error;
      
      setSuccess(`Restauración completada: ${data}`);
      await loadBackups();
    } catch (err) {
      setError('Error restaurando backup: ' + (err as Error).message);
    } finally {
      setActionLoading(null);
    }
  };

  const cleanupOldBackups = async () => {
    setActionLoading('cleanup');
    setError(null);
    setSuccess(null);

    try {
      const { data, error } = await supabase.rpc('cleanup_old_backups', {
        retention_days: 30
      } as any);
      
      if (error) throw error;
      
      setSuccess(`${data} backups antiguos eliminados`);
      await loadBackups();
      await loadStats();
    } catch (err) {
      setError('Error limpiando backups: ' + (err as Error).message);
    } finally {
      setActionLoading(null);
    }
  };

  // ============================================
  // UTILIDADES
  // ============================================

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'warning',
      in_progress: 'info',
      completed: 'success',
      failed: 'error'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'default'}>
        {status}
      </Badge>
    );
  };

  const getTypeBadge = (type: string) => {
    return (
      <Badge variant={type === 'full' ? 'default' : 'info'}>
        {type === 'full' ? 'Completo' : 'Incremental'}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-PY');
  };

  // ============================================
  // RENDER
  // ============================================

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Administración de Backups</h1>
          <p className="text-gray-600 mt-2">
            Gestiona los backups y restauraciones del sistema
          </p>
        </div>
      </div>

      {/* Mensajes de estado */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800">{success}</p>
        </div>
      )}

      {/* Estadísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{stats.total_backups}</div>
              <p className="text-sm text-gray-600">Total Backups</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{stats.completed_backups}</div>
              <p className="text-sm text-gray-600">Completados</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">{stats.failed_backups}</div>
              <p className="text-sm text-gray-600">Fallidos</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-purple-600">{stats.total_size_mb} MB</div>
              <p className="text-sm text-gray-600">Tamaño Total</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Acciones */}
      <Card>
        <CardHeader>
          <CardTitle>Acciones de Backup</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Button
              onClick={createFullBackup}
              disabled={actionLoading === 'full'}
              variant="primary"
            >
              {actionLoading === 'full' ? (
                <LoadingSpinner size="sm" />
              ) : null}
              Crear Backup Completo
            </Button>

            <Button
              onClick={createIncrementalBackup}
              disabled={actionLoading === 'incremental'}
              variant="outline"
            >
              {actionLoading === 'incremental' ? (
                <LoadingSpinner size="sm" />
              ) : null}
              Crear Backup Incremental
            </Button>

            <Button
              onClick={cleanupOldBackups}
              disabled={actionLoading === 'cleanup'}
              variant="destructive"
            >
              {actionLoading === 'cleanup' ? (
                <LoadingSpinner size="sm" />
              ) : null}
              Limpiar Backups Antiguos
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Backups */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Backups</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {backups.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No hay backups disponibles</p>
            ) : (
              backups.map((backup) => (
                <div
                  key={backup.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900">
                          {backup.backup_id}
                        </h3>
                        {getTypeBadge(backup.backup_type)}
                        {getStatusBadge(backup.status)}
                      </div>
                      
                      <div className="text-sm text-gray-600 space-y-1">
                        <p><strong>Creado:</strong> {formatDate(backup.created_at)}</p>
                        {backup.completed_at && (
                          <p><strong>Completado:</strong> {formatDate(backup.completed_at)}</p>
                        )}
                        {backup.last_used_at && (
                          <p><strong>Último uso:</strong> {formatDate(backup.last_used_at)}</p>
                        )}
                        {backup.error_message && (
                          <p className="text-red-600"><strong>Error:</strong> {backup.error_message}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      {backup.status === 'completed' && (
                        <Button
                          onClick={() => restoreBackup(backup.backup_id)}
                          disabled={actionLoading === `restore-${backup.backup_id}`}
                          variant="outline"
                          size="sm"
                        >
                          {actionLoading === `restore-${backup.backup_id}` ? (
                            <LoadingSpinner size="sm" />
                          ) : null}
                          Restaurar
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
