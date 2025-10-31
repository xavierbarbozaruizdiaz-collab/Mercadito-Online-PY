'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Report = {
  id: string;
  reporter_id: string;
  report_type: 'product' | 'user' | 'store' | 'order' | 'review';
  target_id: string;
  reason: string;
  description: string | null;
  status: 'pending' | 'under_review' | 'resolved' | 'rejected' | 'dismissed';
  created_at: string;
  reporter: {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
  } | null;
};

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'under_review' | 'resolved' | 'rejected'>('pending');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolution, setResolution] = useState<'resolved' | 'rejected' | 'dismissed'>('resolved');
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    loadReports();
  }, [filter]);

  async function loadReports() {
    setLoading(true);
    try {
      let query = supabase
        .from('reports')
        .select(`
          id,
          reporter_id,
          report_type,
          target_id,
          reason,
          description,
          status,
          created_at,
          reporter:profiles!reports_reporter_id_fkey(id, email, first_name, last_name)
        `)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Enriquecer con información del objeto denunciado
      const enrichedReports = await Promise.all(
        (data || []).map(async (r: any) => {
          let targetInfo = null;
          try {
            switch (r.report_type) {
              case 'product':
                const { data: product } = await supabase
                  .from('products')
                  .select('id, title')
                  .eq('id', r.target_id)
                  .single();
                targetInfo = product ? { name: (product as any).title, type: 'product' } : null;
                break;
              case 'user':
                const { data: user } = await supabase
                  .from('profiles')
                  .select('id, email, first_name, last_name')
                  .eq('id', r.target_id)
                  .single();
                targetInfo = user
                  ? {
                      name: (user as any).first_name || (user as any).last_name
                        ? `${(user as any).first_name || ''} ${(user as any).last_name || ''}`.trim()
                        : (user as any).email,
                      type: 'user',
                    }
                  : null;
                break;
              case 'store':
                const { data: store } = await supabase
                  .from('stores')
                  .select('id, name')
                  .eq('id', r.target_id)
                  .single();
                targetInfo = store ? { name: (store as any).name, type: 'store' } : null;
                break;
            }
          } catch (err) {
            // Ignorar errores de carga de target
          }

          return {
            ...r,
            target_info: targetInfo,
          };
        })
      );

      setReports(enrichedReports as any);
    } catch (error: any) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleResolve() {
    if (!selectedReport || !resolutionNotes.trim()) {
      alert('Debes ingresar notas de resolución');
      return;
    }

    setProcessing(selectedReport.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No autenticado');

      const { error } = await supabase
        .from('reports')
        .update({
          status: resolution,
          resolved_by: user.id,
          resolved_at: new Date().toISOString(),
          resolution_notes: resolutionNotes,
        })
        .eq('id', selectedReport.id);

      if (error) throw error;

      await loadReports();
      setSelectedReport(null);
      setResolutionNotes('');
      alert('✅ Denuncia resuelta');
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setProcessing(null);
    }
  }

  function getTypeLabel(type: string) {
    switch (type) {
      case 'product':
        return 'Producto';
      case 'user':
        return 'Usuario';
      case 'store':
        return 'Tienda';
      case 'order':
        return 'Orden';
      case 'review':
        return 'Reseña';
      default:
        return type;
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'under_review':
        return 'bg-blue-100 text-blue-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'dismissed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  if (loading && reports.length === 0) {
    return (
      <main className="min-h-screen bg-gray-50 p-4 sm:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando denuncias...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Moderación - Denuncias</h1>
          <p className="text-gray-600 mt-2">Revisar y resolver denuncias de usuarios</p>
        </div>

        {/* Filtros */}
        <div className="bg-white p-4 rounded-lg shadow-sm border mb-6">
          <div className="flex gap-2 overflow-x-auto">
            {(['all', 'pending', 'under_review', 'resolved', 'rejected'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                  filter === f
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {f === 'all' && 'Todas'}
                {f === 'pending' && 'Pendientes'}
                {f === 'under_review' && 'En Revisión'}
                {f === 'resolved' && 'Resueltas'}
                {f === 'rejected' && 'Rechazadas'}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de denuncias */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Denunciado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Motivo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Denunciante</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reports.map((report) => (
                  <tr key={report.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                        {getTypeLabel(report.report_type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {(report as any).target_info ? (report as any).target_info.name : `ID: ${report.target_id.substring(0, 8)}`}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 max-w-xs truncate">{report.reason}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {report.reporter ? (
                        <div>
                          <div>
                            {report.reporter.first_name || report.reporter.last_name
                              ? `${report.reporter.first_name || ''} ${report.reporter.last_name || ''}`.trim()
                              : report.reporter.email}
                          </div>
                          <div className="text-xs text-gray-400">{report.reporter.email}</div>
                        </div>
                      ) : (
                        'N/A'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(report.status)}`}>
                        {report.status === 'pending' && 'Pendiente'}
                        {report.status === 'under_review' && 'En Revisión'}
                        {report.status === 'resolved' && 'Resuelta'}
                        {report.status === 'rejected' && 'Rechazada'}
                        {report.status === 'dismissed' && 'Descartada'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(report.created_at).toLocaleDateString('es-PY')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => setSelectedReport(report)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Ver/Resolver
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {reports.length === 0 && (
            <div className="p-8 text-center text-gray-500">No hay denuncias {filter !== 'all' ? `con estado "${filter}"` : ''}</div>
          )}
        </div>

        {/* Modal de resolución */}
        {selectedReport && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">Detalles de la Denuncia</h2>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-sm font-medium text-gray-700">Tipo</label>
                  <div className="text-sm text-gray-900">{getTypeLabel(selectedReport.report_type)}</div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Denunciado</label>
                  <div className="text-sm text-gray-900">
                    {(selectedReport as any).target_info ? (selectedReport as any).target_info.name : `ID: ${selectedReport.target_id}`}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Denunciante</label>
                  <div className="text-sm text-gray-900">
                    {selectedReport.reporter
                      ? `${selectedReport.reporter.first_name || ''} ${selectedReport.reporter.last_name || ''}`.trim() || selectedReport.reporter.email
                      : 'N/A'}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Motivo</label>
                  <div className="text-sm text-gray-900">{selectedReport.reason}</div>
                </div>

                {selectedReport.description && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Descripción</label>
                    <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">{selectedReport.description}</div>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-gray-700">Estado Actual</label>
                  <div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(selectedReport.status)}`}>
                      {selectedReport.status === 'pending' && 'Pendiente'}
                      {selectedReport.status === 'under_review' && 'En Revisión'}
                      {selectedReport.status === 'resolved' && 'Resuelta'}
                      {selectedReport.status === 'rejected' && 'Rechazada'}
                      {selectedReport.status === 'dismissed' && 'Descartada'}
                    </span>
                  </div>
                </div>
              </div>

              {selectedReport.status === 'pending' || selectedReport.status === 'under_review' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Resolución</label>
                    <select
                      value={resolution}
                      onChange={(e) => setResolution(e.target.value as any)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="resolved">Resolver (aceptar denuncia)</option>
                      <option value="rejected">Rechazar denuncia</option>
                      <option value="dismissed">Descartar</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notas de Resolución</label>
                    <textarea
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="Explica la resolución de esta denuncia..."
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleResolve}
                      disabled={processing === selectedReport.id || !resolutionNotes.trim()}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {processing === selectedReport.id ? 'Procesando...' : 'Resolver'}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedReport(null);
                        setResolutionNotes('');
                      }}
                      className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setSelectedReport(null);
                    setResolutionNotes('');
                  }}
                  className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cerrar
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

