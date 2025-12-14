'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  DollarSign,
  User,
  Calendar,
  Filter,
  RefreshCw,
  ArrowRight,
  Eye
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/lib/hooks/useToast';
import { logger } from '@/lib/utils/logger';

interface PendingApprovalAuction {
  id: string;
  title: string;
  cover_url: string | null;
  current_bid: number;
  buy_now_price: number;
  approval_status: string;
  approval_deadline: string | null;
  approval_decision_at: string | null;
  approval_notes: string | null;
  winner_id: string | null;
  auction_end_at: string | null;
  created_at: string;
  updated_at: string;
  winner?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
}

interface PendingApprovalResponse {
  success: boolean;
  data?: PendingApprovalAuction[];
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  stats?: {
    total: number;
    urgent: number;
    expired: number;
  };
}

export default function PendingApprovalPage() {
  const [auctions, setAuctions] = useState<PendingApprovalAuction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{ total: number; urgent: number; expired: number }>({
    total: 0,
    urgent: 0,
    expired: 0,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [filter, setFilter] = useState<'all' | 'urgent' | 'expired'>('all');
  const [sortBy, setSortBy] = useState<'deadline' | 'created_at' | 'amount'>('deadline');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedAuction, setSelectedAuction] = useState<PendingApprovalAuction | null>(null);
  
  const router = useRouter();
  const toast = useToast();

  const loadAuctions = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        sortBy,
        filter,
      });

      const response = await fetch(`/api/auctions/pending-approval?${params}`);
      const result: PendingApprovalResponse = await response.json();

      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.error || 'Error al cargar subastas');
      }

      setAuctions(result.data);
      if (result.stats) {
        setStats(result.stats);
      }
      if (result.pagination) {
        setPagination(result.pagination);
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar subastas pendientes de aprobación');
      logger.error('Error loading pending approvals', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuctions();
  }, [filter, sortBy, pagination.page]);

  const handleApprove = async (auctionId: string, notes?: string) => {
    if (!confirm('¿Confirmas que deseas aprobar esta compra? El comprador podrá proceder con el pago.')) {
      return;
    }

    try {
      setProcessingId(auctionId);
      
      const response = await fetch(`/api/auctions/${auctionId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', notes }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error al aprobar');
      }

      toast.success('Compra aprobada exitosamente');
      loadAuctions(); // Recargar lista
      setSelectedAuction(null);
    } catch (err: any) {
      toast.error(err.message || 'Error al aprobar compra');
      logger.error('Error approving auction', err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (auctionId: string, notes?: string) => {
    if (!confirm('¿Confirmas que deseas rechazar esta compra? El comprador será notificado del rechazo.')) {
      return;
    }

    try {
      setProcessingId(auctionId);
      
      const response = await fetch(`/api/auctions/${auctionId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', notes }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error al rechazar');
      }

      toast.success('Compra rechazada');
      loadAuctions(); // Recargar lista
      setSelectedAuction(null);
    } catch (err: any) {
      toast.error(err.message || 'Error al rechazar compra');
      logger.error('Error rejecting auction', err);
    } finally {
      setProcessingId(null);
    }
  };

  const getUrgencyStatus = (deadline: string | null) => {
    if (!deadline) return 'normal';
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const hoursUntilDeadline = (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursUntilDeadline < 0) return 'expired';
    if (hoursUntilDeadline < 24) return 'urgent';
    return 'normal';
  };

  const formatTimeRemaining = (deadline: string | null) => {
    if (!deadline) return 'Sin plazo';
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const ms = deadlineDate.getTime() - now.getTime();
    
    if (ms < 0) return 'Expirado';
    
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h`;
    const minutes = Math.floor(ms / (1000 * 60));
    return `${minutes}m`;
  };

  const differencePercentage = (current: number, target: number) => {
    return ((target - current) / target * 100).toFixed(1);
  };

  if (loading && auctions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-3 text-gray-600">Cargando aprobaciones pendientes...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Aprobaciones Pendientes</h1>
              <p className="text-gray-600 mt-1">
                Subastas finalizadas que requieren tu aprobación
              </p>
            </div>
            <Button
              onClick={() => loadAuctions()}
              disabled={loading}
              variant="outline"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Pendientes</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                  </div>
                  <Clock className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card className={stats.urgent > 0 ? 'border-orange-300 bg-orange-50' : ''}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Urgentes (&lt;24h)</p>
                    <p className="text-2xl font-bold text-orange-600">{stats.urgent}</p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>

            <Card className={stats.expired > 0 ? 'border-red-300 bg-red-50' : ''}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Expiradas</p>
                    <p className="text-2xl font-bold text-red-600">{stats.expired}</p>
                  </div>
                  <XCircle className="w-8 h-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters and Sort */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Filtro:</span>
              <select
                value={filter}
                onChange={(e) => {
                  setFilter(e.target.value as any);
                  setPagination({ ...pagination, page: 1 });
                }}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm"
              >
                <option value="all">Todas</option>
                <option value="urgent">Urgentes (&lt;24h)</option>
                <option value="expired">Expiradas</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Ordenar por:</span>
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value as any);
                  setPagination({ ...pagination, page: 1 });
                }}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm"
              >
                <option value="deadline">Plazo (más urgente primero)</option>
                <option value="created_at">Fecha (más reciente primero)</option>
                <option value="amount">Monto (mayor primero)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Empty State */}
        {!loading && auctions.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                ¡No hay aprobaciones pendientes!
              </h3>
              <p className="text-gray-600">
                Todas tus subastas están al día.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Auctions List */}
        {auctions.length > 0 && (
          <div className="space-y-4">
            {auctions.map((auction) => {
              const urgency = getUrgencyStatus(auction.approval_deadline);
              const timeRemaining = formatTimeRemaining(auction.approval_deadline);
              const diffPercent = differencePercentage(auction.current_bid, auction.buy_now_price);
              const isProcessing = processingId === auction.id;

              return (
                <Card 
                  key={auction.id}
                  className={`${
                    urgency === 'expired' ? 'border-red-300 bg-red-50' :
                    urgency === 'urgent' ? 'border-orange-300 bg-orange-50' :
                    ''
                  }`}
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row gap-6">
                      {/* Image */}
                      {auction.cover_url && (
                        <div className="flex-shrink-0">
                          <img
                            src={auction.cover_url}
                            alt={auction.title}
                            className="w-32 h-32 object-cover rounded-lg"
                          />
                        </div>
                      )}

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-gray-900 mb-1">
                              {auction.title}
                            </h3>
                            <Link 
                              href={`/auctions/${auction.id}`}
                              className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1"
                            >
                              Ver subasta <ArrowRight className="w-3 h-3" />
                            </Link>
                          </div>

                          {/* Urgency Badge */}
                          {urgency === 'expired' && (
                            <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                              Expirado
                            </span>
                          )}
                          {urgency === 'urgent' && (
                            <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">
                              Urgente
                            </span>
                          )}
                        </div>

                        {/* Info Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div className="flex items-center gap-2 text-sm">
                            <DollarSign className="w-4 h-4 text-gray-500" />
                            <span className="text-gray-600">Monto ganador:</span>
                            <span className="font-bold text-gray-900">
                              {formatCurrency(auction.current_bid)}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-sm">
                            <DollarSign className="w-4 h-4 text-gray-500" />
                            <span className="text-gray-600">Precio compra inmediata:</span>
                            <span className="font-bold text-emerald-600">
                              {formatCurrency(auction.buy_now_price)}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-sm">
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                            <span className="text-gray-600">Diferencia:</span>
                            <span className="font-bold text-amber-600">
                              {diffPercent}% menor
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="w-4 h-4 text-gray-500" />
                            <span className="text-gray-600">Tiempo restante:</span>
                            <span className={`font-bold ${
                              urgency === 'expired' ? 'text-red-600' :
                              urgency === 'urgent' ? 'text-orange-600' :
                              'text-gray-900'
                            }`}>
                              {timeRemaining}
                            </span>
                          </div>

                          {auction.winner && (
                            <div className="flex items-center gap-2 text-sm col-span-2">
                              <User className="w-4 h-4 text-gray-500" />
                              <span className="text-gray-600">Ganador:</span>
                              <span className="font-medium text-gray-900">
                                {auction.winner.first_name || auction.winner.last_name
                                  ? `${auction.winner.first_name || ''} ${auction.winner.last_name || ''}`.trim()
                                  : auction.winner.email?.split('@')[0] || 'Usuario'}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap gap-3 pt-4 border-t">
                          <Button
                            onClick={() => handleApprove(auction.id)}
                            disabled={isProcessing}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            {isProcessing ? (
                              <>
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                Procesando...
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Aprobar Compra
                              </>
                            )}
                          </Button>

                          <Button
                            onClick={() => handleReject(auction.id)}
                            disabled={isProcessing}
                            variant="destructive"
                          >
                            {isProcessing ? (
                              <>
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                Procesando...
                              </>
                            ) : (
                              <>
                                <XCircle className="w-4 h-4 mr-2" />
                                Rechazar
                              </>
                            )}
                          </Button>

                          <Button
                            onClick={() => setSelectedAuction(auction)}
                            variant="outline"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Ver Detalles
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-6">
            <Button
              onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
              disabled={pagination.page === 1 || loading}
              variant="outline"
            >
              Anterior
            </Button>
            <span className="text-sm text-gray-600">
              Página {pagination.page} de {pagination.totalPages}
            </span>
            <Button
              onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
              disabled={pagination.page >= pagination.totalPages || loading}
              variant="outline"
            >
              Siguiente
            </Button>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedAuction && (
        <AuctionDetailModal
          auction={selectedAuction}
          onClose={() => setSelectedAuction(null)}
          onApprove={(notes) => {
            handleApprove(selectedAuction.id, notes);
          }}
          onReject={(notes) => {
            handleReject(selectedAuction.id, notes);
          }}
          isProcessing={processingId === selectedAuction.id}
        />
      )}
    </div>
  );
}

// Modal de Detalles
interface AuctionDetailModalProps {
  auction: PendingApprovalAuction;
  onClose: () => void;
  onApprove: (notes?: string) => void;
  onReject: (notes?: string) => void;
  isProcessing: boolean;
}

function AuctionDetailModal({ auction, onClose, onApprove, onReject, isProcessing }: AuctionDetailModalProps) {
  const [notes, setNotes] = useState('');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Detalles de la Subasta</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-gray-900 mb-2">{auction.title}</h3>
              {auction.cover_url && (
                <img
                  src={auction.cover_url}
                  alt={auction.title}
                  className="w-full h-48 object-cover rounded-lg mb-4"
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Monto ganador</p>
                <p className="text-lg font-bold text-gray-900">
                  {formatCurrency(auction.current_bid)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Precio compra inmediata</p>
                <p className="text-lg font-bold text-emerald-600">
                  {formatCurrency(auction.buy_now_price)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Diferencia</p>
                <p className="text-lg font-bold text-amber-600">
                  {((auction.buy_now_price - auction.current_bid) / auction.buy_now_price * 100).toFixed(1)}% menor
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Plazo de respuesta</p>
                <p className="text-lg font-bold text-gray-900">
                  {auction.approval_deadline
                    ? new Date(auction.approval_deadline).toLocaleString('es-PY')
                    : 'No especificado'}
                </p>
              </div>
            </div>

            {auction.winner && (
              <div>
                <p className="text-sm text-gray-600 mb-1">Ganador</p>
                <p className="font-medium text-gray-900">
                  {auction.winner.first_name || auction.winner.last_name
                    ? `${auction.winner.first_name || ''} ${auction.winner.last_name || ''}`.trim()
                    : auction.winner.email || 'Usuario'}
                </p>
                {auction.winner.email && (
                  <p className="text-sm text-gray-500">{auction.winner.email}</p>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notas (opcional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Agregar notas sobre tu decisión..."
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                rows={3}
              />
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button
                onClick={() => onApprove(notes || undefined)}
                disabled={isProcessing}
                className="bg-green-600 hover:bg-green-700 text-white flex-1"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Aprobar Compra
              </Button>
              <Button
                onClick={() => onReject(notes || undefined)}
                disabled={isProcessing}
                variant="destructive"
                className="flex-1"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Rechazar
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

