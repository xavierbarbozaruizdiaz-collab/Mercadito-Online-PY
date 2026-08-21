// ============================================
// CATÁLOGO LOCAL (tienda Cellshop / retail PY)
// Segunda tienda oficial, aparte de Ubuy fallback
// ============================================

import { randomBytes } from 'node:crypto';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';
import { getAdminClient } from '@/lib/services/sourcedCatalogService';

export const LOCAL_SOURCE_PLATFORM = 'cellshop';

export type LocalCatalogStore = {
  id: string;
  seller_id: string;
  name: string;
  slug: string;
  settings: Record<string, any> | null;
  is_fallback_store: boolean;
  is_active: boolean;
};

export interface LocalCatalogSettings {
  enabled: boolean;
  markup_percent: number;
  buffer_percent: number;
  import_token: string;
  default_source: string;
}

export const DEFAULT_LOCAL_CATALOG_SETTINGS: LocalCatalogSettings = {
  enabled: true,
  markup_percent: 15,
  buffer_percent: 5,
  import_token: '',
  default_source: 'Cellshop',
};

export function generateImportToken(): string {
  return randomBytes(24).toString('hex');
}

export function parseLocalCatalogSettings(
  storeSettings: Record<string, any> | null | undefined
): LocalCatalogSettings {
  const raw = storeSettings?.local_catalog || {};
  return {
    enabled: raw.enabled !== false,
    markup_percent: Number.isFinite(Number(raw.markup_percent))
      ? Number(raw.markup_percent)
      : DEFAULT_LOCAL_CATALOG_SETTINGS.markup_percent,
    buffer_percent: Number.isFinite(Number(raw.buffer_percent))
      ? Number(raw.buffer_percent)
      : DEFAULT_LOCAL_CATALOG_SETTINGS.buffer_percent,
    import_token:
      typeof raw.import_token === 'string' && raw.import_token.trim()
        ? raw.import_token.trim()
        : '',
    default_source:
      typeof raw.default_source === 'string' && raw.default_source.trim()
        ? raw.default_source.trim()
        : DEFAULT_LOCAL_CATALOG_SETTINGS.default_source,
  };
}

/** Precio público PYG desde precio Cellshop (ya en Gs.). */
export function computeLocalSalePricePyg(params: {
  sourcePricePyg: number;
  markupPercent: number;
  bufferPercent: number;
}): number {
  const markup = params.markupPercent / 100;
  const buffer = params.bufferPercent / 100;
  const raw = params.sourcePricePyg * (1 + markup) * (1 + buffer);
  if (!Number.isFinite(raw) || raw <= 0) return 1000;
  return Math.ceil(raw / 1000) * 1000;
}

function isLocalCatalogStoreRow(row: LocalCatalogStore | null): boolean {
  if (!row) return false;
  const lc = row.settings?.local_catalog;
  return Boolean(lc && lc.enabled === true);
}

async function isAdminUser(userId: string, db: SupabaseClient<Database>): Promise<boolean> {
  const { data } = await (db as any)
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();
  return data?.role === 'admin';
}

export async function getLocalCatalogStore(
  admin?: SupabaseClient<Database>
): Promise<LocalCatalogStore | null> {
  const db = admin || getAdminClient();
  const { data, error } = await (db as any)
    .from('stores')
    .select('id, seller_id, name, slug, settings, is_fallback_store, is_active')
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(80);

  if (error) throw error;
  const rows = (data || []) as LocalCatalogStore[];
  return rows.find(isLocalCatalogStoreRow) || null;
}

export async function ensureOfficialLocalCatalogStore(
  adminUserId: string,
  admin?: SupabaseClient<Database>
): Promise<LocalCatalogStore> {
  const db = admin || getAdminClient();
  const existing = await getLocalCatalogStore(db);
  if (existing) {
    const settings = parseLocalCatalogSettings(existing.settings);
    if (!settings.import_token) {
      const nextSettings = {
        ...(existing.settings || {}),
        local_catalog: {
          ...settings,
          enabled: true,
          import_token: generateImportToken(),
        },
      };
      await (db as any).from('stores').update({ settings: nextSettings }).eq('id', existing.id);
      return { ...existing, settings: nextSettings };
    }
    return existing;
  }

  let slug = 'mercadito-local';
  const { data: slugHit } = await (db as any).from('stores').select('id').eq('slug', slug).maybeSingle();
  if (slugHit) slug = `mercadito-local-${adminUserId.slice(0, 8)}`;

  const localCatalog: LocalCatalogSettings = {
    ...DEFAULT_LOCAL_CATALOG_SETTINGS,
    enabled: true,
    import_token: generateImportToken(),
  };

  const { data: created, error: createError } = await (db as any)
    .from('stores')
    .insert({
      seller_id: adminUserId,
      name: 'Mercadito Local',
      slug,
      description:
        'Tienda oficial de Mercadito Online PY. Catálogo local (Cellshop y similares): listás y comprás al confirmar el cliente.',
      is_active: true,
      is_fallback_store: false,
      settings: { local_catalog: localCatalog },
    })
    .select('id, seller_id, name, slug, settings, is_fallback_store, is_active')
    .single();

  if (createError || !created) {
    throw new Error(createError?.message || 'No se pudo crear la tienda local');
  }

  return created as LocalCatalogStore;
}

export async function assertUserOwnsLocalCatalogStore(
  userId: string,
  admin?: SupabaseClient<Database>
): Promise<{ ok: true; store: LocalCatalogStore } | { ok: false; error: string; store?: undefined }> {
  const db = admin || getAdminClient();
  if (!(await isAdminUser(userId, db))) {
    return { ok: false, error: 'Solo administradores pueden operar el catálogo local' };
  }
  const store = await ensureOfficialLocalCatalogStore(userId, db);
  if (store.seller_id !== userId) {
    // Admin puede operar aunque la tienda esté a nombre de otro admin histórico
    const stillAdmin = await isAdminUser(userId, db);
    if (!stillAdmin) {
      return { ok: false, error: 'Sin acceso a la tienda local' };
    }
  }
  return { ok: true, store };
}

export async function findLocalCatalogStoreByImportToken(
  token: string,
  admin?: SupabaseClient<Database>
): Promise<LocalCatalogStore | null> {
  const trimmed = token.trim();
  if (!trimmed) return null;
  const db = admin || getAdminClient();
  const store = await getLocalCatalogStore(db);
  if (!store) return null;
  const settings = parseLocalCatalogSettings(store.settings);
  if (!settings.import_token || settings.import_token !== trimmed) return null;
  return store;
}

export async function updateLocalCatalogSettings(params: {
  userId: string;
  patch: Partial<{
    markup_percent: number;
    buffer_percent: number;
    default_source: string;
    regenerate_token: boolean;
    store_name: string;
  }>;
}) {
  const ownership = await assertUserOwnsLocalCatalogStore(params.userId);
  if (!ownership.ok) throw new Error(ownership.error);
  const db = getAdminClient();
  const current = parseLocalCatalogSettings(ownership.store.settings);

  const nextLocal: LocalCatalogSettings = {
    enabled: true,
    markup_percent:
      params.patch.markup_percent !== undefined
        ? Number(params.patch.markup_percent)
        : current.markup_percent,
    buffer_percent:
      params.patch.buffer_percent !== undefined
        ? Number(params.patch.buffer_percent)
        : current.buffer_percent,
    default_source:
      params.patch.default_source !== undefined
        ? String(params.patch.default_source).trim() || current.default_source
        : current.default_source,
    import_token: params.patch.regenerate_token
      ? generateImportToken()
      : current.import_token || generateImportToken(),
  };

  const nextSettings = {
    ...(ownership.store.settings || {}),
    local_catalog: nextLocal,
  };

  const updatePayload: Record<string, unknown> = { settings: nextSettings };
  if (typeof params.patch.store_name === 'string' && params.patch.store_name.trim()) {
    updatePayload.name = params.patch.store_name.trim().slice(0, 120);
  }

  const { data, error } = await (db as any)
    .from('stores')
    .update(updatePayload)
    .eq('id', ownership.store.id)
    .select('id, seller_id, name, slug, settings, is_fallback_store, is_active')
    .single();

  if (error) throw error;
  return data as LocalCatalogStore;
}

export function parsePygPriceInput(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) {
    return Math.round(raw);
  }
  if (typeof raw !== 'string') return null;
  const digits = raw.replace(/[^\d]/g, '');
  if (!digits) return null;
  const n = parseInt(digits, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function importLocalCatalogProduct(params: {
  store: LocalCatalogStore;
  title: string;
  sourcePricePyg: number;
  imageUrl?: string | null;
  source?: string | null;
  sourceUrl?: string | null;
  currency?: string | null;
  /** Default paused — publish via «En tienda» (active). DB allows active|paused|archived|sold. */
  status?: 'paused' | 'active';
}) {
  const db = getAdminClient();
  const settings = parseLocalCatalogSettings(params.store.settings);
  const title = params.title.trim().slice(0, 200);
  if (!title) throw new Error('title es requerido');
  if (params.sourcePricePyg <= 0) throw new Error('price inválido');

  const currency = (params.currency || 'PYG').toUpperCase();
  if (currency !== 'PYG' && currency !== 'GS' && currency !== 'GS.') {
    throw new Error('Solo se acepta currency PYG por ahora');
  }

  const salePrice = computeLocalSalePricePyg({
    sourcePricePyg: params.sourcePricePyg,
    markupPercent: settings.markup_percent,
    bufferPercent: settings.buffer_percent,
  });

  const sourceLabel = (params.source || settings.default_source || 'Cellshop').trim().slice(0, 80);
  const sourceUrl = params.sourceUrl?.trim() || null;
  const imageUrl = params.imageUrl?.trim() || null;
  const status = params.status === 'active' ? 'active' : 'paused';

  const productPayload = {
    store_id: params.store.id,
    seller_id: params.store.seller_id,
    title,
    description: `Producto de ${sourceLabel}. Precio origen ${params.sourcePricePyg.toLocaleString('es-PY')} Gs. Se compra al confirmar el cliente.`,
    price: salePrice,
    condition: 'nuevo',
    sale_type: 'direct',
    status,
    stock_quantity: 99,
    stock_management_enabled: false,
    tags: ['local-catalog', sourceLabel.toLowerCase()],
    cover_url: imageUrl,
    fulfillment_type: 'sourced',
    source_platform: LOCAL_SOURCE_PLATFORM,
    source_product_id: sourceUrl ? sourceUrl.slice(0, 180) : null,
    source_url: sourceUrl,
    source_currency: 'PYG',
    source_price: params.sourcePricePyg,
    source_shipping_price: 0,
    markup_percent: settings.markup_percent,
    fx_rate_used: 1,
    estimated_delivery_min_days: 1,
    estimated_delivery_max_days: 7,
    last_source_synced_at: new Date().toISOString(),
    source_available: true,
  };

  if (sourceUrl) {
    const { data: existing } = await (db as any)
      .from('products')
      .select('id, status')
      .eq('store_id', params.store.id)
      .eq('source_url', sourceUrl)
      .eq('fulfillment_type', 'sourced')
      .maybeSingle();

    if (existing?.id) {
      // Re-import refreshes price/title but keeps storefront visibility choice
      const { status: _status, ...updatePayload } = productPayload;
      const { data, error } = await (db as any)
        .from('products')
        .update(updatePayload)
        .eq('id', existing.id)
        .select(
          'id, title, price, cover_url, source_price, source_currency, source_url, source_platform, status, updated_at'
        )
        .single();
      if (error) throw error;
      return { product: data, created: false };
    }
  }

  const { data, error } = await (db as any)
    .from('products')
    .insert(productPayload)
    .select(
      'id, title, price, cover_url, source_price, source_currency, source_url, source_platform, status, created_at'
    )
    .single();

  if (error) throw error;
  return { product: data, created: true };
}

export async function setLocalCatalogProductVisibility(params: {
  storeId: string;
  productId: string;
  visible: boolean;
}) {
  const db = getAdminClient();
  const { data, error } = await (db as any)
    .from('products')
    .update({ status: params.visible ? 'active' : 'paused' })
    .eq('id', params.productId)
    .eq('store_id', params.storeId)
    .eq('fulfillment_type', 'sourced')
    .eq('source_platform', LOCAL_SOURCE_PLATFORM)
    .select('id, title, status, price, cover_url, source_url, source_price')
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('Producto no encontrado en el catálogo local');
  return data;
}
