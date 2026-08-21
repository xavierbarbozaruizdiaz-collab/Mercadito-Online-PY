// ============================================
// CATÁLOGO SOURCED (tienda fallback tipo Ubuy)
// Import / upsert / sync / precio PYG
// ============================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';
import { logger } from '@/lib/utils/logger';
import {
  AliExpressProduct,
  getDsRecommendFeed,
  getSourcedProductDetails,
  isAliExpressConfigured,
  isAliExpressPermissionError,
  searchAffiliateProducts,
} from '@/lib/services/aliexpressClient';
import { resolveAliExpressFeeds } from '@/lib/services/aliexpressCategoryMap';

export const SOURCE_PLATFORM = 'aliexpress';

export interface SourcedCatalogSettings {
  usd_pyg: number;
  markup_percent: number;
  buffer_percent: number;
  default_delivery_min_days: number;
  default_delivery_max_days: number;
}

export const DEFAULT_SOURCED_SETTINGS: SourcedCatalogSettings = {
  usd_pyg: 7800,
  markup_percent: 35,
  buffer_percent: 10,
  default_delivery_min_days: 15,
  default_delivery_max_days: 45,
};

export function getAdminClient(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !key) {
    throw new Error('Supabase admin no configurado (URL o SERVICE_ROLE_KEY)');
  }
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function parseSourcedSettings(storeSettings: Record<string, any> | null | undefined): SourcedCatalogSettings {
  const raw = storeSettings?.sourced_catalog || {};
  return {
    usd_pyg: Number(raw.usd_pyg) > 0 ? Number(raw.usd_pyg) : DEFAULT_SOURCED_SETTINGS.usd_pyg,
    markup_percent: Number.isFinite(Number(raw.markup_percent))
      ? Number(raw.markup_percent)
      : DEFAULT_SOURCED_SETTINGS.markup_percent,
    buffer_percent: Number.isFinite(Number(raw.buffer_percent))
      ? Number(raw.buffer_percent)
      : DEFAULT_SOURCED_SETTINGS.buffer_percent,
    default_delivery_min_days:
      Number(raw.default_delivery_min_days) > 0
        ? Number(raw.default_delivery_min_days)
        : DEFAULT_SOURCED_SETTINGS.default_delivery_min_days,
    default_delivery_max_days:
      Number(raw.default_delivery_max_days) > 0
        ? Number(raw.default_delivery_max_days)
        : DEFAULT_SOURCED_SETTINGS.default_delivery_max_days,
  };
}

export function computeLandedPricePyg(params: {
  sourcePrice: number;
  sourceShipping: number;
  fx: number;
  markupPercent: number;
  bufferPercent: number;
}): number {
  const markup = params.markupPercent / 100;
  const buffer = params.bufferPercent / 100;
  const usd = (params.sourcePrice + params.sourceShipping) * params.fx * (1 + markup) * (1 + buffer);
  if (!Number.isFinite(usd) || usd <= 0) return 1000;
  return Math.ceil(usd / 1000) * 1000;
}

export async function getFallbackStore(admin?: SupabaseClient<Database>) {
  const db = admin || getAdminClient();
  const { data: active, error: activeError } = await (db as any)
    .from('stores')
    .select('id, seller_id, name, slug, settings, is_fallback_store, is_active')
    .eq('is_fallback_store', true)
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (activeError) throw activeError;
  if (active) {
    return active as {
      id: string;
      seller_id: string;
      name: string;
      slug: string;
      settings: Record<string, any> | null;
      is_fallback_store: boolean;
      is_active: boolean;
    };
  }

  const { data: anyFallback, error } = await (db as any)
    .from('stores')
    .select('id, seller_id, name, slug, settings, is_fallback_store, is_active')
    .eq('is_fallback_store', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (anyFallback || null) as {
    id: string;
    seller_id: string;
    name: string;
    slug: string;
    settings: Record<string, any> | null;
    is_fallback_store: boolean;
    is_active: boolean;
  } | null;
}

async function isAdminUser(userId: string, db: SupabaseClient<Database>): Promise<boolean> {
  const { data } = await (db as any)
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();
  return data?.role === 'admin';
}

/**
 * La tienda Ubuy es la fallback oficial, operada por administradores de Mercadito.
 * Si no hay ninguna, se usa (o crea) la tienda del admin actual.
 */
export async function ensureOfficialSourcedStore(adminUserId: string, admin?: SupabaseClient<Database>) {
  const db = admin || getAdminClient();

  const existing = await getFallbackStore(db);
  if (existing) {
    if (!existing.is_active) {
      await (db as any).from('stores').update({ is_active: true }).eq('id', existing.id);
      return { ...existing, is_active: true };
    }
    return existing;
  }

  const { data: adminStore } = await (db as any)
    .from('stores')
    .select('id, seller_id, name, slug, settings, is_fallback_store, is_active')
    .eq('seller_id', adminUserId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (adminStore) {
    await (db as any).from('stores').update({ is_fallback_store: false }).eq('is_fallback_store', true);
    await (db as any)
      .from('stores')
      .update({ is_fallback_store: true, is_active: true })
      .eq('id', adminStore.id);
    return {
      ...adminStore,
      is_fallback_store: true,
      is_active: true,
    } as {
      id: string;
      seller_id: string;
      name: string;
      slug: string;
      settings: Record<string, any> | null;
      is_fallback_store: boolean;
      is_active: boolean;
    };
  }

  let slug = 'mercadito-internacional';
  const { data: slugHit } = await (db as any).from('stores').select('id').eq('slug', slug).maybeSingle();
  if (slugHit) slug = `mercadito-internacional-${adminUserId.slice(0, 8)}`;

  const { data: created, error: createError } = await (db as any)
    .from('stores')
    .insert({
      seller_id: adminUserId,
      name: 'Mercadito Internacional',
      slug,
      description:
        'Tienda oficial de Mercadito Online PY. Catálogo internacional (tipo Ubuy): productos sourced sin stock local.',
      is_active: true,
      is_fallback_store: true,
      settings: { sourced_catalog: DEFAULT_SOURCED_SETTINGS },
    })
    .select('id, seller_id, name, slug, settings, is_fallback_store, is_active')
    .single();

  if (createError || !created) {
    throw new Error(createError?.message || 'No se pudo crear la tienda oficial del admin');
  }

  return created as {
    id: string;
    seller_id: string;
    name: string;
    slug: string;
    settings: Record<string, any> | null;
    is_fallback_store: boolean;
    is_active: boolean;
  };
}

export async function assertUserOwnsFallbackStore(userId: string, admin?: SupabaseClient<Database>) {
  const db = admin || getAdminClient();
  if (!(await isAdminUser(userId, db))) {
    return {
      ok: false as const,
      error: 'Solo el administrador de Mercadito puede gestionar el catálogo internacional (tienda Ubuy).',
      store: null,
    };
  }

  try {
    const store = await ensureOfficialSourcedStore(userId, db);
    return { ok: true as const, error: null, store };
  } catch (err: any) {
    return {
      ok: false as const,
      error: err?.message || 'No hay tienda oficial configurada para el admin',
      store: null,
    };
  }
}

async function upsertProductImages(
  db: SupabaseClient<Database>,
  productId: string,
  urls: string[]
) {
  const unique = Array.from(new Set(urls.filter((u) => typeof u === 'string' && u.startsWith('http')))).slice(0, 8);
  if (unique.length === 0) return;

  await (db as any).from('product_images').delete().eq('product_id', productId);

  const rows = unique.map((url, idx) => ({
    product_id: productId,
    url,
    image_url: url,
    is_cover: idx === 0,
    idx,
    sort_order: idx,
  }));

  const { error } = await (db as any).from('product_images').insert(rows);
  if (error) {
    const fallback = unique.map((url, idx) => ({
      product_id: productId,
      url,
      image_url: url,
      is_cover: idx === 0,
    }));
    const retry = await (db as any).from('product_images').insert(fallback);
    if (retry.error) {
      logger.warn('[SourcedCatalog] no se pudieron guardar imágenes', retry.error);
    }
  }
}

function buildProductPayload(
  ae: AliExpressProduct,
  store: { id: string; seller_id: string },
  settings: SourcedCatalogSettings,
  categoryId?: string | null
) {
  const price = computeLandedPricePyg({
    sourcePrice: ae.salePrice,
    sourceShipping: ae.shippingPrice,
    fx: settings.usd_pyg,
    markupPercent: settings.markup_percent,
    bufferPercent: settings.buffer_percent,
  });

  const comparePrice = ae.originalPrice
    ? computeLandedPricePyg({
        sourcePrice: ae.originalPrice,
        sourceShipping: ae.shippingPrice,
        fx: settings.usd_pyg,
        markupPercent: settings.markup_percent,
        bufferPercent: settings.buffer_percent,
      })
    : null;

  return {
    store_id: store.id,
    seller_id: store.seller_id,
    title: ae.title.slice(0, 200),
    description: ae.description || `Producto importado. Envío internacional estimado ${settings.default_delivery_min_days}–${settings.default_delivery_max_days} días.`,
    price,
    compare_price: comparePrice && comparePrice > price ? comparePrice : null,
    condition: 'nuevo',
    sale_type: 'direct',
    status: 'active',
    stock_quantity: 99,
    stock_management_enabled: false,
    tags: ['sourced', 'aliexpress'],
    cover_url: ae.imageUrl,
    fulfillment_type: 'sourced',
    source_platform: SOURCE_PLATFORM,
    source_product_id: ae.productId,
    source_url: ae.productUrl,
    source_currency: ae.currency || 'USD',
    source_price: ae.salePrice,
    source_shipping_price: ae.shippingPrice,
    markup_percent: settings.markup_percent,
    fx_rate_used: settings.usd_pyg,
    estimated_delivery_min_days: settings.default_delivery_min_days,
    estimated_delivery_max_days: settings.default_delivery_max_days,
    last_source_synced_at: new Date().toISOString(),
    source_available: true,
    ...(categoryId ? { category_id: categoryId } : {}),
  };
}

export async function importAliExpressProducts(params: {
  productIds: string[];
  userId: string;
  keyword?: string;
}): Promise<{ imported: number; updated: number; skipped: number; errors: string[] }> {
  const db = getAdminClient();
  const ownership = await assertUserOwnsFallbackStore(params.userId, db);
  if (!ownership.ok || !ownership.store) {
    throw new Error(ownership.error);
  }

  const store = ownership.store;
  const settings = parseSourcedSettings(store.settings);
  const uniqueIds = Array.from(new Set(params.productIds.map((id) => String(id).trim()).filter(Boolean))).slice(0, 40);

  const jobInsert = await (db as any)
    .from('sourced_import_jobs')
    .insert({
      store_id: store.id,
      created_by: params.userId,
      keyword: params.keyword || null,
      status: 'running',
      requested_count: uniqueIds.length,
    })
    .select('id')
    .single();

  const jobId = jobInsert.data?.id as string | undefined;
  let imported = 0;
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  try {
    const details = await getSourcedProductDetails(uniqueIds);
    const byId = new Map(details.map((p) => [p.productId, p]));

    for (const id of uniqueIds) {
      const ae = byId.get(id);
      if (!ae || ae.salePrice <= 0) {
        skipped += 1;
        errors.push(`${id}: sin precio o detalle`);
        continue;
      }

      const payload = buildProductPayload(ae, store, settings);

      const { data: existing } = await (db as any)
        .from('products')
        .select('id')
        .eq('store_id', store.id)
        .eq('source_platform', SOURCE_PLATFORM)
        .eq('source_product_id', ae.productId)
        .maybeSingle();

      if (existing?.id) {
        const { error } = await (db as any)
          .from('products')
          .update(payload)
          .eq('id', existing.id);
        if (error) {
          skipped += 1;
          errors.push(`${id}: ${error.message}`);
          continue;
        }
        await upsertProductImages(db, existing.id, ae.imageUrls.length ? ae.imageUrls : ae.imageUrl ? [ae.imageUrl] : []);
        updated += 1;
      } else {
        const { data: created, error } = await (db as any)
          .from('products')
          .insert(payload)
          .select('id')
          .single();
        if (error || !created?.id) {
          skipped += 1;
          errors.push(`${id}: ${error?.message || 'insert falló'}`);
          continue;
        }
        await upsertProductImages(db, created.id, ae.imageUrls.length ? ae.imageUrls : ae.imageUrl ? [ae.imageUrl] : []);
        imported += 1;
      }
    }

    if (jobId) {
      await (db as any)
        .from('sourced_import_jobs')
        .update({
          status: 'completed',
          imported_count: imported,
          updated_count: updated,
          skipped_count: skipped,
          error_message: errors.length ? errors.slice(0, 8).join(' | ') : null,
          finished_at: new Date().toISOString(),
        })
        .eq('id', jobId);
    }
  } catch (err: any) {
    if (jobId) {
      await (db as any)
        .from('sourced_import_jobs')
        .update({
          status: 'failed',
          imported_count: imported,
          updated_count: updated,
          skipped_count: skipped,
          error_message: err?.message || 'Error importando',
          finished_at: new Date().toISOString(),
        })
        .eq('id', jobId);
    }
    throw err;
  }

  return { imported, updated, skipped, errors };
}

async function loadStoreCategories(db: ReturnType<typeof getAdminClient>) {
  const { data, error } = await (db as any)
    .from('categories')
    .select('id, name')
    .order('name', { ascending: true });
  if (error) throw error;
  return (data || []) as Array<{ id: string; name: string }>;
}

async function upsertSourcedProduct(
  db: ReturnType<typeof getAdminClient>,
  ae: AliExpressProduct,
  store: { id: string; seller_id: string },
  settings: SourcedCatalogSettings,
  categoryId?: string | null
): Promise<'imported' | 'updated'> {
  const payload = buildProductPayload(ae, store, settings, categoryId);
  const { data: existing } = await (db as any)
    .from('products')
    .select('id')
    .eq('store_id', store.id)
    .eq('source_platform', SOURCE_PLATFORM)
    .eq('source_product_id', ae.productId)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await (db as any).from('products').update(payload).eq('id', existing.id);
    if (error) throw error;
    await upsertProductImages(db, existing.id, ae.imageUrls.length ? ae.imageUrls : ae.imageUrl ? [ae.imageUrl] : []);
    return 'updated';
  }

  const { data: created, error } = await (db as any).from('products').insert(payload).select('id').single();
  if (error || !created?.id) throw new Error(error?.message || 'insert falló');
  await upsertProductImages(db, created.id, ae.imageUrls.length ? ae.imageUrls : ae.imageUrl ? [ae.imageUrl] : []);
  return 'imported';
}

export async function importDropshipRecommended(params: {
  userId?: string;
  categoryOffset?: number;
  categoryLimit?: number;
  pageSize?: number;
}): Promise<{
  imported: number;
  updated: number;
  skipped: number;
  errors: string[];
  categories: Array<{ aeName: string; mercadito: string; count: number }>;
  nextOffset: number;
  totalFeeds: number;
  done: boolean;
}> {
  if (!isAliExpressConfigured()) {
    throw new Error('AliExpress no está configurado en el servidor');
  }

  const db = getAdminClient();
  let store: { id: string; seller_id: string; settings: Record<string, any> | null };

  if (params.userId) {
    const ownership = await assertUserOwnsFallbackStore(params.userId, db);
    if (!ownership.ok || !ownership.store) {
      throw new Error(ownership.error);
    }
    store = ownership.store;
  } else {
    const fallback = await getFallbackStore(db);
    if (!fallback) {
      throw new Error('No hay tienda Ubuy (fallback) configurada');
    }
    store = fallback;
  }

  const settings = parseSourcedSettings(store.settings);
  const mercaditoCategories = await loadStoreCategories(db);
  const feeds = resolveAliExpressFeeds(mercaditoCategories);
  const offset = Math.max(0, params.categoryOffset || 0);
  const limit = Math.min(12, Math.max(1, params.categoryLimit || 8));
  const pageSize = Math.min(20, Math.max(5, params.pageSize || 12));
  const slice = feeds.slice(offset, offset + limit);

  let imported = 0;
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];
  const categories: Array<{ aeName: string; mercadito: string; count: number }> = [];
  const feedNames = ['DS bestseller', 'Best Selling', 'Hot Product'];
  let feedName = feedNames[0];
  let resolvedFeed = false;

  for (const feed of slice) {
    let count = 0;
    try {
      let result = await getDsRecommendFeed({
        categoryId: feed.aeCategoryId,
        feedName,
        page: 1,
        pageSize,
      });

      if (!resolvedFeed && result.products.length === 0) {
        for (const alt of feedNames.slice(1)) {
          const probe = await getDsRecommendFeed({
            categoryId: feed.aeCategoryId,
            feedName: alt,
            page: 1,
            pageSize,
          });
          if (probe.products.length > 0) {
            feedName = alt;
            result = probe;
            break;
          }
        }
        resolvedFeed = true;
      }

      if (result.products.length === 0) {
        errors.push(`${feed.aeName}: AliExpress no devolvió productos en el feed`);
      }

      for (const ae of result.products) {
        if (!ae.salePrice || ae.salePrice <= 0) {
          skipped += 1;
          continue;
        }
        try {
          const kind = await upsertSourcedProduct(db, ae, store, settings, feed.mercadito.id);
          if (kind === 'imported') imported += 1;
          else updated += 1;
          count += 1;
        } catch (err: any) {
          skipped += 1;
          errors.push(`${ae.productId}: ${err?.message || 'error'}`);
        }
      }
    } catch (err: any) {
      const message = err?.message || 'Error de feed DS';
      errors.push(`${feed.aeName}: ${message}`);
      if (isAliExpressPermissionError(err)) {
        throw new Error(
          'Esta app Drop Shipping no tiene permiso del feed de recomendados, o falta ALIEXPRESS_ACCESS_TOKEN (autorizar la cuenta en ds.aliexpress.com).'
        );
      }
    }
    categories.push({ aeName: feed.aeName, mercadito: feed.mercadito.name, count });
  }

  const nextOffset = offset + slice.length;
  return {
    imported,
    updated,
    skipped,
    errors: errors.slice(0, 12),
    categories,
    nextOffset,
    totalFeeds: feeds.length,
    done: nextOffset >= feeds.length,
  };
}

export async function searchAliExpressForDashboard(params: {
  keywords: string;
  page?: number;
  pageSize?: number;
}) {
  if (!isAliExpressConfigured()) {
    throw new Error('AliExpress no está configurado en el servidor');
  }
  return searchAffiliateProducts({
    keywords: params.keywords,
    page: params.page,
    pageSize: params.pageSize,
  });
}

const SYNC_BATCH = 25;

export async function syncSourcedCatalog(limit = 80): Promise<{
  checked: number;
  updated: number;
  paused: number;
  errors: string[];
}> {
  const db = getAdminClient();
  const store = await getFallbackStore(db);
  if (!store) {
    return { checked: 0, updated: 0, paused: 0, errors: ['No hay tienda fallback'] };
  }

  const settings = parseSourcedSettings(store.settings);
  const { data: products, error } = await (db as any)
    .from('products')
    .select('id, source_product_id, status')
    .eq('store_id', store.id)
    .eq('fulfillment_type', 'sourced')
    .eq('source_platform', SOURCE_PLATFORM)
    .not('source_product_id', 'is', null)
    .order('last_source_synced_at', { ascending: true, nullsFirst: true })
    .limit(limit);

  if (error) throw error;

  const list = (products || []) as Array<{ id: string; source_product_id: string; status: string }>;
  let updated = 0;
  let paused = 0;
  const errors: string[] = [];

  for (let i = 0; i < list.length; i += SYNC_BATCH) {
    const chunk = list.slice(i, i + SYNC_BATCH);
    const ids = chunk.map((p) => p.source_product_id);
    try {
      const details = await getSourcedProductDetails(ids);
      const byId = new Map(details.map((d) => [d.productId, d]));

      for (const product of chunk) {
        const ae = byId.get(product.source_product_id);
        if (!ae || ae.salePrice <= 0) {
          await (db as any)
            .from('products')
            .update({
              status: 'paused',
              source_available: false,
              last_source_synced_at: new Date().toISOString(),
            })
            .eq('id', product.id);
          paused += 1;
          continue;
        }

        const payload = buildProductPayload(ae, store, settings);
        const { error: updateError } = await (db as any)
          .from('products')
          .update({
            ...payload,
            status: product.status === 'archived' ? product.status : 'active',
          })
          .eq('id', product.id);

        if (updateError) {
          errors.push(`${product.source_product_id}: ${updateError.message}`);
        } else {
          updated += 1;
        }
      }
    } catch (err: any) {
      errors.push(err?.message || 'Error de sync');
      logger.error('[SourcedCatalog] sync batch failed', err);
    }
  }

  return { checked: list.length, updated, paused, errors };
}

export async function updateSourcedSettings(
  userId: string,
  patch: Partial<SourcedCatalogSettings>
): Promise<SourcedCatalogSettings> {
  const db = getAdminClient();
  const ownership = await assertUserOwnsFallbackStore(userId, db);
  if (!ownership.ok || !ownership.store) throw new Error(ownership.error);

  const current = parseSourcedSettings(ownership.store.settings);
  const next: SourcedCatalogSettings = {
    usd_pyg: patch.usd_pyg ?? current.usd_pyg,
    markup_percent: patch.markup_percent ?? current.markup_percent,
    buffer_percent: patch.buffer_percent ?? current.buffer_percent,
    default_delivery_min_days: patch.default_delivery_min_days ?? current.default_delivery_min_days,
    default_delivery_max_days: patch.default_delivery_max_days ?? current.default_delivery_max_days,
  };

  const merged = {
    ...(ownership.store.settings || {}),
    sourced_catalog: next,
  };

  const { error } = await (db as any)
    .from('stores')
    .update({ settings: merged })
    .eq('id', ownership.store.id);

  if (error) throw error;
  return next;
}
