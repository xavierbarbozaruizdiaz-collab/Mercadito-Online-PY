'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui';
import { Card, CardContent } from '@/components/ui/Card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Trophy,
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  DollarSign,
  ShoppingCart,
  Filter,
  RefreshCw,
  ArrowRight,
  Eye,
  Calendar
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/lib/hooks/useToast';
import { logger } from '@/lib/utils/logger';

interface MyWinAuction {
  id: string;
  title: string;
  cover_url: string | null;
  current_bid: number;
  buy_now_price: number | null;
  approval_status: string | null;
  approval_deadline: string | null;
  approval_decision_at: string | null;
  approval_notes: string | null;
  winner_id: string | null;
  auction_status: string;
  auction_end_at: string | null;
  created_at: string;
  seller?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
}

interface MyWinsResponse {
  success: boolean;
  data?: MyWinAuction[];
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  stats?: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    no_approval_needed: number;
  };
}

export default function MyWinsPage() {
  const [auctions, setAuctions] = useState<MyWinAuction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    no_approval_needed: number;
  }>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    no_approval_needed: 0,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'no_approval_needed'>('all');
  
  const router = useRouter();
  const toast = useToast();

  const loadAuctions = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        filter,
      });

      const response = await fetch(`/api/auctions/my-wins?${params}`);
      const result: MyWinsResponse = await response.json();

      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.error || 'Error al cargar subastas ganadas');
      }

      setAuctions(result.data);
      if (result.stats) {
        setStats(result.stats);
      }
      if (result.pagination) {
        setPagination(result.pagination);
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar subastas ganadas');
      logger.error('Error loading my wins', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuctions();
  }, [filter, pagination.page]);

  const getApprovalStatusInfo = (auction: MyWinAuction) => {
    const needsApproval = auction.buy_now_price && auction.current_bid < auction.buy_now_price;
    
    if (!needsApproval || !auction.approval_status) {
      return {
        status: 'no_approval_needed',
        label: 'Listo para comprar',
        icon: CheckCircle,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-300',
        description: 'Esta subasta no requiere aprobación. Puedes proceder al pago.',
        canCheckout: true,
      };
    }

    if (auction.approval_status === 'approved') {
      return {
        status: 'approved',
        label: 'Aprobada - Listo para comprar',
        icon: CheckCircle,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-300',
        description: 'El vendedor ha aprobado tu compra. Puedes proceder al pago ahora.',
        canCheckout: true,
      };
    }

    if (auction.approval_status === 'rejected') {
      return {
        status: 'rejected',
        label: 'Rechazada',
        icon: XCircle,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-300',
        description: auction.approval_notes 
          ? `El vendedor rechazó tu compra. Nota: ${auction.approval_notes}`
          : 'El vendedor rechazó tu compra. El monto ganador no alcanzó el precio esperado.',
        canCheckout: false,
      };
    }

    if (auction.approval_status === 'pending_approval') {
      const deadline = auction.approval_deadline ? new Date(auction.approval_deadline) : null;
      const now = new Date();
      const isExpired = deadline && deadline < now;
      const hoursUntilDeadline = deadline 
        ? Math.floor((deadline.getTime() - now.getTime()) / (1000 * 60 * 60))
        : null;

      return {
        status: 'pending',
        label: isExpired ? 'Esperando aprobación (Plazo expirado)' : 'Esperando aprobación',
        icon: Clock,
        color: isExpired ? 'text-red-600' : 'text-amber-600',
        bgColor: isExpired ? 'bg-red-50' : 'bg-amber-50',
        borderColor: isExpired ? 'border-red-300' : 'border-amber-300',
        description: isExpired
          ? 'El plazo de aprobación expiró. Contacta al vendedor para más información.'
          : hoursUntilDeadline !== null
          ? `Esperando respuesta del vendedor. Plazo: ${hoursUntilDeadline > 0 ? `${hoursUntilDeadline}h restantes` : 'Menos de 1 hora'}.`
          : 'Esperando respuesta del vendedor sobre tu compra.',
        canCheckout: false,
      };
    }

    return {
      status: 'unknown',
      label: 'Estado desconocido',
      icon: AlertTriangle,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-300',
      description: 'Estado no disponible.',
      canCheckout: false,
    };
  };

  const handleCheckout = (auctionId: string) => {
    router.push(`/checkout?auction=${auctionId}`);
  };

  if (loading && auctions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-3 text-gray-600">Cargando subastas ganadas...</span>
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
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Trophy className="w-8 h-8 text-yellow-600" />
                Mis Subastas Ganadas
              </h1>
              <p className="text-gray-600 mt-1">
                Gestiona tus compras de subastas
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
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                  </div>
                  <Trophy className="w-8 h-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>

            <Card className={stats.pending > 0 ? 'border-amber-300 bg-amber-50' : ''}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Pendientes</p>
                    <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
                  </div>
                  <Clock className="w-8 h-8 text-amber-600" />
                </div>
              </CardContent>
            </Card>

            <Card className={stats.approved > 0 ? 'border-green-300 bg-green-50' : ''}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Aprobadas</p>
                    <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card className={stats.rejected > 0 ? 'border-red-300 bg-red-50' : ''}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Rechazadas</p>
                    <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
                  </div>
                  <XCircle className="w-8 h-8 text-red-600" />
                </div>
              </CardContent>
            </Card>

            <Card className={stats.no_approval_needed > 0 ? 'border-blue-300 bg-blue-50' : ''}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Sin aprobación</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.no_approval_needed}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
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
                <option value="pending">Pendientes de aprobación</option>
                <option value="approved">Aprobadas</option>
                <option value="rejected">Rechazadas</option>
                <option value="no_approval_needed">Sin aprobación necesaria</option>
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
              <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                No has ganado ninguna subasta aún
              </h3>
              <p className="text-gray-600 mb-4">
                ¡Sigue pujando en las subastas para ganar!
              </p>
              <Link href="/auctions">
                <Button variant="primary">
                  Ver Subastas Activas
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Auctions List */}
        {auctions.length > 0 && (
          <div className="space-y-4">
            {auctions.map((auction) => {
              const statusInfo = getApprovalStatusInfo(auction);
              const StatusIcon = statusInfo.icon;

              return (
                <Card 
                  key={auction.id}
                  className={`${statusInfo.bgColor} ${statusInfo.borderColor} border-2`}
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

                          {/* Status Badge */}
                          <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${statusInfo.bgColor} ${statusInfo.borderColor} border`}>
                            <StatusIcon className={`w-4 h-4 ${statusInfo.color}`} />
                            <span className={`text-sm font-medium ${statusInfo.color}`}>
                              {statusInfo.label}
                            </span>
                          </div>
                        </div>

                        {/* Status Description */}
                        <div className={`p-3 rounded-lg mb-4 ${statusInfo.bgColor} border ${statusInfo.borderColor}`}>
                          <p className={`text-sm ${statusInfo.color}`}>
                            {statusInfo.description}
                          </p>
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

                          {auction.buy_now_price && (
                            <div className="flex items-center gap-2 text-sm">
                              <DollarSign className="w-4 h-4 text-gray-500" />
                              <span className="text-gray-600">Precio compra inmediata:</span>
                              <span className="font-bold text-emerald-600">
                                {formatCurrency(auction.buy_now_price)}
                              </span>
                            </div>
                          )}

                          {auction.approval_deadline && (
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="w-4 h-4 text-gray-500" />
                              <span className="text-gray-600">Plazo de aprobación:</span>
                              <span className="font-medium text-gray-900">
                                {new Date(auction.approval_deadline).toLocaleString('es-PY')}
                              </span>
                            </div>
                          )}

                          {auction.auction_end_at && (
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="w-4 h-4 text-gray-500" />
                              <span className="text-gray-600">Finalizó:</span>
                              <span className="font-medium text-gray-900">
                                {new Date(auction.auction_end_at).toLocaleString('es-PY')}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap gap-3 pt-4 border-t">
                          {statusInfo.canCheckout && (
                            <Button
                              onClick={() => handleCheckout(auction.id)}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              <ShoppingCart className="w-4 h-4 mr-2" />
                              Proceder al Pago
                            </Button>
                          )}

                          <Link href={`/auctions/${auction.id}`}>
                            <Button variant="outline">
                              <Eye className="w-4 h-4 mr-2" />
                              Ver Detalles
                            </Button>
                          </Link>
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
    </div>
  );
}

