'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { supabase } from '@/lib/supabase/client';
import { formatCurrency, formatDate } from '@/lib/utils';
import { logger } from '@/lib/utils/logger';
import { useToast } from '@/lib/hooks/useToast';
import {
  Plus,
  TrendingUp,
  Eye,
  Pause,
  Play,
  Trash2,
  Edit,
  Target,
  DollarSign,
  Users,
  Calendar,
  BarChart3,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  ExternalLink,
  Settings,
  Package,
  Star
} from 'lucide-react';
import Link from 'next/link';

// ============================================
// TIPOS
// ============================================

interface MarketingCampaign {
  id: string;
  store_id: string | null;
  campaign_type: 'general' | 'individual';
  meta_campaign_id: string | null;
  name: string;
  objective: string | null;
  budget_amount: number | null;
  budget_type: 'daily' | 'lifetime' | null;
  status: 'draft' | 'active' | 'paused' | 'archived';
  target_url: string;
  ad_set_id: string | null;
  creative_id: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  metadata: Record<string, any>;
}

interface CampaignMetrics {
  id: string;
  campaign_id: string;
  date: string;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  ctr: number | null;
  cpc: number | null;
  cpm: number | null;
}

interface Store {
  id: string;
  name: string;
  slug: string;
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function MarketingPage() {
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<Record<string, CampaignMetrics[]>>({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [syncingCatalog, setSyncingCatalog] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs para control absoluto - SIN dependencias circulares
  const initializedRef = useRef(false);
  const loadingRef = useRef(false);
  const currentStoreIdRef = useRef<string | null>(null);

  // UN SOLO useEffect para toda la inicialización
  useEffect(() => {
    // Si ya se inicializó, no hacer nada
    if (initializedRef.current) return;
    
    // Si está cargando auth, esperar
    if (authLoading) return;
    
    // Si no hay usuario, no hacer nada
    if (!user?.id) {
      setLoading(false);
      return;
    }

    // Marcar como inicializado INMEDIATAMENTE para evitar ejecuciones múltiples
    initializedRef.current = true;
    loadingRef.current = true;

    (async () => {
      try {
        setLoading(true);
        const userId = user.id;

        // 1. Cargar tiendas
        const { data: storesData, error: storesError } = await supabase
          .from('stores')
          .select('id, name, slug, is_fallback_store')
          .eq('seller_id', userId)
          .eq('is_active', true);

        if (storesError && storesError.code !== 'PGRST116') {
          logger.error('Error loading stores', storesError);
          setStores([]);
        } else {
          const storesList = storesData || [];
          setStores(storesList);

          // 2. Seleccionar tienda inicial si hay tiendas
          if (storesList.length > 0) {
            const fallbackStore = storesList.find((s: any) => s.is_fallback_store === true);
            const storeToSelect = fallbackStore || storesList[0];
            currentStoreIdRef.current = storeToSelect.id;
            setSelectedStore(storeToSelect.id);
          }
        }

        // 3. Cargar campañas (solo si hay tienda seleccionada)
        const storeIdToLoad = currentStoreIdRef.current;
        if (storeIdToLoad) {
          let query = supabase
            .from('marketing_campaigns')
            .select('*')
            .order('created_at', { ascending: false });

          query = query.eq('store_id', storeIdToLoad);

          const { data: campaignsData, error: campaignsError } = await query;

          if (campaignsError && campaignsError.code !== 'PGRST116' && campaignsError.code !== '42P01' && campaignsError.code !== 'PGRST301') {
            logger.error('Error loading campaigns', campaignsError);
            setCampaigns([]);
          } else {
            setCampaigns(campaignsData || []);
            
            // Cargar métricas si hay campañas
            if (campaignsData && campaignsData.length > 0) {
              try {
                const { data: metricsData } = await supabase
                  .from('campaign_metrics')
                  .select('*')
                  .in('campaign_id', campaignsData.map(c => c.id))
                  .order('date', { ascending: false });

                if (metricsData) {
                  const grouped: Record<string, CampaignMetrics[]> = {};
                  metricsData.forEach((metric: CampaignMetrics) => {
                    if (!grouped[metric.campaign_id]) {
                      grouped[metric.campaign_id] = [];
                    }
                    grouped[metric.campaign_id].push(metric);
                  });
                  setMetrics(grouped);
                }
              } catch (metricsErr) {
                logger.warn('Error loading metrics', metricsErr);
              }
            }
          }
        }
      } catch (err) {
        logger.error('Error in initialization', err);
        setError('Ocurrió un error al cargar los datos. Por favor, recarga la página.');
      } finally {
        setLoading(false);
        loadingRef.current = false;
      }
    })();
  }, [user?.id, authLoading]); // Solo estas dos dependencias

  // useEffect SEPARADO solo para cuando cambia selectedStore manualmente
  useEffect(() => {
    // Solo ejecutar si ya se inicializó y el store cambió manualmente
    if (!initializedRef.current) return;
    if (!user?.id || authLoading) return;
    if (loadingRef.current) return;

    const newStoreId = selectedStore;
    
    // Si no cambió realmente, no hacer nada
    if (newStoreId === currentStoreIdRef.current) return;
    
    // Si es null, no cargar
    if (!newStoreId) {
      setCampaigns([]);
      return;
    }

    // Actualizar ref
    currentStoreIdRef.current = newStoreId;
    loadingRef.current = true;

    (async () => {
      try {
        setLoading(true);

        let query = supabase
          .from('marketing_campaigns')
          .select('*')
          .order('created_at', { ascending: false })
          .eq('store_id', newStoreId);

        const { data, error } = await query;

        if (error && error.code !== 'PGRST116' && error.code !== '42P01' && error.code !== 'PGRST301') {
          logger.error('Error loading campaigns', error);
          setCampaigns([]);
        } else {
          setCampaigns(data || []);
          
          if (data && data.length > 0) {
            try {
              const { data: metricsData } = await supabase
                .from('campaign_metrics')
                .select('*')
                .in('campaign_id', data.map(c => c.id))
                .order('date', { ascending: false });

              if (metricsData) {
                const grouped: Record<string, CampaignMetrics[]> = {};
                metricsData.forEach((metric: CampaignMetrics) => {
                  if (!grouped[metric.campaign_id]) {
                    grouped[metric.campaign_id] = [];
                  }
                  grouped[metric.campaign_id].push(metric);
                });
                setMetrics(grouped);
              }
            } catch (metricsErr) {
              logger.warn('Error loading metrics', metricsErr);
            }
          }
        }
      } catch (err) {
        logger.error('Error loading campaigns', err);
        setCampaigns([]);
      } finally {
        setLoading(false);
        loadingRef.current = false;
      }
    })();
  }, [selectedStore, user?.id, authLoading]);

  // Verificar autenticación
  useEffect(() => {
    if (!authLoading && !user) {
      const timer = setTimeout(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (!session) {
            window.location.href = '/auth/sign-in';
          }
        });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [authLoading, user]);

  async function syncCatalog() {
    try {
      setSyncingCatalog(true);
      toast.error('La sincronización masiva de catálogo aún no está disponible. Por favor, sincroniza productos individualmente desde la página de productos.');
    } catch (err) {
      logger.error('Error syncing catalog', err);
      toast.error('Error al sincronizar catálogo');
    } finally {
      setSyncingCatalog(false);
    }
  }

  function getCampaignStatusBadge(status: string) {
    const styles = {
      draft: 'bg-gray-100 text-gray-800',
      active: 'bg-green-100 text-green-800',
      paused: 'bg-yellow-100 text-yellow-800',
      archived: 'bg-gray-100 text-gray-600',
    };

    const icons = {
      draft: <AlertCircle className="w-3 h-3" />,
      active: <CheckCircle className="w-3 h-3" />,
      paused: <Pause className="w-3 h-3" />,
      archived: <XCircle className="w-3 h-3" />,
    };

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {icons[status as keyof typeof icons]}
        {status === 'draft' ? 'Borrador' : status === 'active' ? 'Activa' : status === 'paused' ? 'Pausada' : 'Archivada'}
      </span>
    );
  }

  function getTotalMetrics(campaignId: string) {
    const campaignMetrics = metrics[campaignId] || [];
    return {
      impressions: campaignMetrics.reduce((sum, m) => sum + m.impressions, 0),
      clicks: campaignMetrics.reduce((sum, m) => sum + m.clicks, 0),
      spend: campaignMetrics.reduce((sum, m) => sum + m.spend, 0),
      conversions: campaignMetrics.reduce((sum, m) => sum + m.conversions, 0),
      ctr: campaignMetrics.length > 0 ? campaignMetrics.reduce((sum, m) => sum + (m.ctr || 0), 0) / campaignMetrics.length : 0,
    };
  }

  // Loading inicial
  if (authLoading && !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b mb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Marketing y Campañas</h1>
              <p className="text-gray-600 mt-1">Gestiona tus campañas publicitarias y sincroniza tu catálogo</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={syncCatalog}
                disabled={syncingCatalog}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${syncingCatalog ? 'animate-spin' : ''}`} />
                {syncingCatalog ? 'Sincronizando...' : 'Sincronizar Catálogo'}
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nueva Campaña
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sección de Catálogos */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Catálogos</h2>
          <p className="text-gray-600 text-sm">Gestiona tus catálogos de productos para publicidad y feeds externos</p>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Tarjeta: Mis Catálogos de Anuncios */}
          <Link
            href="/dashboard/marketing/catalogos-anuncios"
            className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 border border-gray-200 hover:border-blue-300"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Package className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Mis Catálogos de Anuncios</h3>
                  <p className="text-sm text-gray-600 mt-1">Catálogos personalizados por tienda</p>
                </div>
              </div>
              <ExternalLink className="w-5 h-5 text-gray-400 flex-shrink-0" />
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Crea y gestiona catálogos personalizados de productos para usar en campañas de publicidad (Meta, TikTok, Google). Cada catálogo puede tener filtros específicos o selección manual de productos.
            </p>
            <div className="flex items-center text-blue-600 font-medium text-sm">
              Ver Catálogos
              <ExternalLink className="w-4 h-4 ml-2" />
            </div>
          </Link>

          {/* Tarjeta: Catálogo Mercadito */}
          <Link
            href="/dashboard/marketing/catalogo-mercadito"
            className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 border border-gray-200 hover:border-blue-300"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Star className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Catálogo Mercadito</h3>
                  <p className="text-sm text-gray-600 mt-1">Vitrina principal del marketplace</p>
                </div>
              </div>
              <ExternalLink className="w-5 h-5 text-gray-400 flex-shrink-0" />
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Destaca hasta 2 productos en la vitrina principal de Mercadito. Estos productos aparecerán en la página de "Catálogo General" visible para todos los usuarios.
            </p>
            <div className="flex items-center text-blue-600 font-medium text-sm">
              Gestionar Catálogo
              <ExternalLink className="w-4 h-4 ml-2" />
            </div>
          </Link>
        </div>
      </div>

      {/* Mensaje de error si existe */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-800">{error}</p>
              {stores.length === 0 && (
                <p className="text-sm text-yellow-700 mt-2">
                  Necesitas tener una tienda activa para usar las funciones de marketing. 
                  <Link href="/dashboard/become-seller" className="underline ml-1">
                    Crear tienda
                  </Link>
                </p>
              )}
            </div>
            <button
              onClick={() => setError(null)}
              className="text-yellow-600 hover:text-yellow-800"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Separador */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
        <div className="border-t border-gray-200"></div>
      </div>

      {/* Filtro de tienda - Solo mostrar si hay más de una tienda */}
      {stores.length > 1 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filtrar por tienda:
            </label>
            <select
              value={selectedStore || ''}
              onChange={(e) => {
                const newStoreId = e.target.value || null;
                currentStoreIdRef.current = newStoreId;
                setSelectedStore(newStoreId);
              }}
              className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas las tiendas</option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Lista de campañas */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {loading ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando campañas...</p>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay campañas</h3>
            <p className="text-gray-600 mb-6">Crea tu primera campaña publicitaria para empezar</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Crear Primera Campaña
            </button>
          </div>
        ) : (
          <div className="grid gap-6">
            {campaigns.map((campaign) => {
              const totalMetrics = getTotalMetrics(campaign.id);
              const store = stores.find(s => s.id === campaign.store_id);

              return (
                <div key={campaign.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
                  <div className="p-6">
                    {/* Header de la campaña */}
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{campaign.name}</h3>
                          {getCampaignStatusBadge(campaign.status)}
                          {campaign.campaign_type === 'general' && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                              General
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                          {store && (
                            <span className="flex items-center gap-1">
                              <span>Tienda:</span>
                              <span className="font-medium">{store.name}</span>
                            </span>
                          )}
                          {campaign.objective && (
                            <span className="flex items-center gap-1">
                              <Target className="w-4 h-4" />
                              {campaign.objective}
                            </span>
                          )}
                          {campaign.budget_amount && (
                            <span className="flex items-center gap-1">
                              <DollarSign className="w-4 h-4" />
                              {formatCurrency(campaign.budget_amount)} / {campaign.budget_type === 'daily' ? 'día' : 'total'}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            Creada: {formatDate(campaign.created_at)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/dashboard/marketing/${campaign.id}`}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          title="Ver detalles"
                        >
                          <Eye className="w-5 h-5" />
                        </Link>
                        <button
                          className="p-2 text-gray-600 hover:text-yellow-600 hover:bg-yellow-50 rounded-md transition-colors"
                          title="Editar"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    {/* Métricas */}
                    {totalMetrics.impressions > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                        <div>
                          <div className="text-sm text-gray-600">Impresiones</div>
                          <div className="text-lg font-semibold text-gray-900">
                            {totalMetrics.impressions.toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">Clics</div>
                          <div className="text-lg font-semibold text-gray-900">
                            {totalMetrics.clicks.toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">CTR</div>
                          <div className="text-lg font-semibold text-gray-900">
                            {totalMetrics.ctr.toFixed(2)}%
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">Conversiones</div>
                          <div className="text-lg font-semibold text-gray-900">
                            {totalMetrics.conversions.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de crear campaña (simplificado) */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Nueva Campaña</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              <p className="text-gray-600 mb-4">
                Para crear una campaña completa, ve a la página de detalle de la campaña.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <Link
                  href="/dashboard/marketing/new"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Continuar
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
