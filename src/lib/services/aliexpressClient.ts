// ============================================
// ALIEXPRESS OPEN PLATFORM — Affiliate API (server-only)
// Solo API oficial. Credenciales nunca salen al browser.
// ============================================

import crypto from 'crypto';
import { logger } from '@/lib/utils/logger';

const AE_GATEWAY = process.env.ALIEXPRESS_API_GATEWAY || 'https://api-sg.aliexpress.com/sync';

export class AliExpressConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AliExpressConfigError';
  }
}

export interface AliExpressProduct {
  productId: string;
  title: string;
  description?: string;
  imageUrl: string | null;
  imageUrls: string[];
  productUrl: string | null;
  salePrice: number;
  originalPrice: number | null;
  currency: string;
  shippingPrice: number;
  evaluateRate?: string;
  lastestVolume?: number;
  categoryId?: string;
}

export interface AliExpressSearchResult {
  products: AliExpressProduct[];
  total: number;
  page: number;
  pageSize: number;
}

function getCredentials() {
  const appKey = process.env.ALIEXPRESS_APP_KEY?.trim();
  const appSecret = process.env.ALIEXPRESS_APP_SECRET?.trim();
  const accessToken = process.env.ALIEXPRESS_ACCESS_TOKEN?.trim() || '';
  const trackingId = process.env.ALIEXPRESS_TRACKING_ID?.trim() || '';

  if (!appKey || !appSecret) {
    throw new AliExpressConfigError(
      'Faltan ALIEXPRESS_APP_KEY y/o ALIEXPRESS_APP_SECRET. Configuralas en el entorno del servidor.'
    );
  }

  return { appKey, appSecret, accessToken, trackingId };
}

export function isAliExpressConfigured(): boolean {
  return !!(process.env.ALIEXPRESS_APP_KEY?.trim() && process.env.ALIEXPRESS_APP_SECRET?.trim());
}

export function applyAliExpressUserToken(token: string) {
  process.env.ALIEXPRESS_ACCESS_TOKEN = token.trim();
}

export function hasAliExpressAccessToken(): boolean {
  return !!process.env.ALIEXPRESS_ACCESS_TOKEN?.trim();
}

const ALIEXPRESS_REGISTERED_CALLBACK =
  'https://mercadito-online-py-swart.vercel.app/api/auth/aliexpress/callback';

export function getAliExpressCallbackUrl(): string {
  const fromEnv = process.env.ALIEXPRESS_REDIRECT_URI?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  return ALIEXPRESS_REGISTERED_CALLBACK;
}

export function getAliExpressAuthorizeUrl(): string {
  const { appKey } = getCredentials();
  const params = new URLSearchParams({
    response_type: 'code',
    force_auth: 'true',
    redirect_uri: getAliExpressCallbackUrl(),
    client_id: appKey,
  });
  return `https://api-sg.aliexpress.com/oauth/authorize?${params.toString()}`;
}

function signRestRequest(method: string, params: Record<string, string>, appSecret: string): string {
  const basestring =
    method +
    Object.keys(params)
      .filter((k) => k !== 'sign' && k !== 'method' && params[k] != null && params[k] !== '')
      .sort()
      .map((k) => `${k}${params[k]}`)
      .join('');
  return crypto.createHmac('sha256', appSecret).update(basestring).digest('hex').toUpperCase();
}

function pickAccessToken(payload: any): {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
} | null {
  const root = payload?.data || payload;
  const accessToken = root?.access_token || root?.accessToken;
  if (!accessToken) return null;
  return {
    access_token: String(accessToken),
    refresh_token: root.refresh_token ? String(root.refresh_token) : undefined,
    expires_in: root.expires_in ? Number(root.expires_in) : undefined,
  };
}

export async function exchangeAliExpressAuthCode(code: string): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}> {
  const { appKey, appSecret } = getCredentials();
  const params: Record<string, string> = {
    app_key: appKey,
    code,
    simplify: 'true',
    sign_method: 'sha256',
    timestamp: String(Date.now()),
  };
  params.sign = signRestRequest('/auth/token/create', params, appSecret);

  const qs = new URLSearchParams(params);
  const restRes = await fetch(`https://api-sg.aliexpress.com/rest/auth/token/create?${qs.toString()}`, {
    method: 'POST',
  });
  const restText = await restRes.text();
  let restJson: any = null;
  try {
    restJson = JSON.parse(restText);
  } catch {
    restJson = null;
  }
  const restToken = restJson ? pickAccessToken(restJson) : null;
  if (restToken) return restToken;

  const classicBody = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: appKey,
    client_secret: appSecret,
    sp: 'ae',
    redirect_uri: getAliExpressCallbackUrl(),
  });
  const classicRes = await fetch('https://oauth.aliexpress.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: classicBody,
  });
  const classicText = await classicRes.text();
  let classicJson: any = null;
  try {
    classicJson = JSON.parse(classicText);
  } catch {
    classicJson = null;
  }
  const classicToken = classicJson ? pickAccessToken(classicJson) : null;
  if (classicToken) return classicToken;

  const restError =
    restJson?.error_response?.sub_msg ||
    restJson?.error_response?.msg ||
    restJson?.error_description ||
    restJson?.msg;
  const classicError = classicJson?.error_description || classicJson?.error || classicJson?.msg;
  throw new Error(restError || classicError || `AliExpress no devolvió access_token: ${restText.slice(0, 180)}`);
}

function signRequest(params: Record<string, string>, appSecret: string): string {
  const sorted = Object.keys(params)
    .filter((k) => k !== 'sign' && params[k] !== undefined && params[k] !== '')
    .sort();
  const concatenated = sorted.map((k) => `${k}${params[k]}`).join('');
  return crypto
    .createHmac('sha256', appSecret)
    .update(concatenated, 'utf8')
    .digest('hex')
    .toUpperCase();
}

function timestampNow(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function parseMoney(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^\d.]/g, '');
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function pickImage(raw: Record<string, any>): { cover: string | null; all: string[] } {
  const candidates: string[] = [];
  const push = (v: unknown) => {
    if (typeof v === 'string' && v.startsWith('http')) candidates.push(v.split('?')[0] || v);
  };

  push(raw.product_main_image_url || raw.image_url || raw.productImage || raw.product_small_image_urls);
  const small = raw.product_small_image_urls;
  if (small?.string) asArray(small.string).forEach(push);
  else if (Array.isArray(small)) small.forEach(push);
  if (Array.isArray(raw.product_small_image_url_list)) raw.product_small_image_url_list.forEach(push);

  const unique = Array.from(new Set(candidates));
  return { cover: unique[0] || null, all: unique.slice(0, 8) };
}

function mapRawProduct(raw: Record<string, any>): AliExpressProduct | null {
  const productId = String(raw.product_id || raw.productId || raw.item_id || '').trim();
  if (!productId) return null;

  const title = String(raw.product_title || raw.productTitle || raw.title || '').trim();
  if (!title) return null;

  const images = pickImage(raw);
  const salePrice = parseMoney(
    raw.target_sale_price || raw.sale_price || raw.targetSalePrice || raw.salePrice || raw.price
  );
  const originalPrice = parseMoney(
    raw.target_original_price || raw.original_price || raw.targetOriginalPrice || raw.originalPrice
  );
  const currency = String(
    raw.target_sale_price_currency || raw.sale_price_currency || raw.currency || 'USD'
  );
  const shippingPrice = parseMoney(
    raw.freight || raw.shipping_cost || raw.logistics_cost || raw.target_original_freight || 0
  );

  const productUrl =
    raw.promotion_link ||
    raw.product_detail_url ||
    raw.productUrl ||
    `https://www.aliexpress.com/item/${productId}.html`;

  return {
    productId,
    title,
    description: raw.product_description || raw.description || undefined,
    imageUrl: images.cover,
    imageUrls: images.all.length ? images.all : images.cover ? [images.cover] : [],
    productUrl,
    salePrice,
    originalPrice: originalPrice || null,
    currency,
    shippingPrice,
    evaluateRate: raw.evaluate_rate || raw.evaluateRate,
    lastestVolume: raw.lastest_volume ? Number(raw.lastest_volume) : undefined,
  };
}

export function isAliExpressPermissionError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error || '');
  return /permission to access this api|app does not have permission|isp\.insufficient-isv-permissions/i.test(
    msg
  );
}

function collectProductLike(node: any, acc: any[], depth: number, seen: Set<unknown>) {
  if (!node || depth > 8 || seen.has(node)) return;
  if (typeof node !== 'object') return;
  seen.add(node);
  if (Array.isArray(node)) {
    node.forEach((item) => collectProductLike(item, acc, depth + 1, seen));
    return;
  }
  const id = node.product_id || node.productId || node.item_id;
  const title = node.product_title || node.productTitle || node.title;
  if (id && title) {
    acc.push(node);
    return;
  }
  Object.values(node).forEach((value) => collectProductLike(value, acc, depth + 1, seen));
}

function extractList(payload: any): { products: any[]; total: number } {
  const root =
    payload?.aliexpress_ds_recommend_feed_get_response?.resp_result?.result ||
    payload?.aliexpress_ds_recommend_feed_get_response?.result ||
    payload?.aliexpress_affiliate_product_query_response?.resp_result?.result ||
    payload?.aliexpress_affiliate_product_query_response?.result ||
    payload?.resp_result?.result ||
    payload?.result ||
    payload;

  const productsNode =
    root?.products?.product ||
    root?.products ||
    root?.product_list ||
    root?.data?.products?.product ||
    root?.data?.products ||
    [];

  let products = asArray(productsNode);
  if (products.length === 0) {
    const collected: any[] = [];
    collectProductLike(payload, collected, 0, new Set());
    products = collected;
  }

  const total = Number(root?.current_record_count || root?.total_record_count || root?.total || products.length || 0);
  return { products, total };
}

function extractDetail(payload: any): any[] {
  const root =
    payload?.aliexpress_affiliate_productdetail_get_response?.resp_result?.result ||
    payload?.aliexpress_affiliate_productdetail_get_response?.result ||
    payload?.resp_result?.result ||
    payload?.result ||
    payload;

  return asArray(root?.products?.product || root?.products || root);
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function parseAliExpressRateLimitWaitMs(message: string): number | null {
  if (!/frequency of app access|exceeds the limit|ban will last/i.test(message)) return null;
  const match = message.match(/last\s+(\d+)\s+second/i);
  const seconds = match ? Number(match[1]) : 3;
  return Math.min(15000, Math.max(1500, (seconds + 1) * 1000));
}

async function callApi(
  method: string,
  bizParams: Record<string, string>,
  attempt = 1
): Promise<any> {
  const { appKey, appSecret, accessToken } = getCredentials();

  const sys: Record<string, string> = {
    method,
    app_key: appKey,
    timestamp: timestampNow(),
    format: 'json',
    v: '2.0',
    sign_method: 'sha256',
    simplify: 'true',
    ...bizParams,
  };

  if (accessToken) {
    sys.session = accessToken;
  }

  sys.sign = signRequest(sys, appSecret);

  const body = new URLSearchParams(sys);
  const res = await fetch(AE_GATEWAY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
    body,
  });

  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`AliExpress devolvió una respuesta no JSON (${res.status})`);
  }

  const errorBody = json?.error_response;
  const errorCode = errorBody?.code;
  const errorMsg = errorBody?.sub_msg || errorBody?.msg || json?.msg;

  if (!res.ok || errorBody) {
    const codeStr = String(errorCode || res.status);
    const waitMs =
      parseAliExpressRateLimitWaitMs(String(errorMsg || '')) ||
      ((codeStr === '27' || codeStr === '7' || res.status === 429) ? 400 * 2 ** attempt : null);
    if (waitMs && attempt < 6) {
      logger.warn('[AliExpress] rate limit, reintento', { attempt, waitMs, method });
      await sleep(waitMs);
      return callApi(method, bizParams, attempt + 1);
    }
    throw new Error(errorMsg || `Error AliExpress (${codeStr})`);
  }

  return json;
}

export async function searchAffiliateProducts(options: {
  keywords: string;
  page?: number;
  pageSize?: number;
  shipToCountry?: string;
  targetCurrency?: string;
  targetLanguage?: string;
}): Promise<AliExpressSearchResult> {
  const { trackingId } = getCredentials();
  const page = options.page || 1;
  const pageSize = Math.min(Math.max(options.pageSize || 20, 1), 50);

  const biz: Record<string, string> = {
    keywords: options.keywords.trim(),
    page_no: String(page),
    page_size: String(pageSize),
    target_currency: options.targetCurrency || 'USD',
    target_language: options.targetLanguage || 'ES',
    ship_to_country: options.shipToCountry || 'PY',
  };
  if (trackingId) biz.tracking_id = trackingId;

  const payload = await callApi('aliexpress.affiliate.product.query', biz);
  const extracted = extractList(payload);
  const products = extracted.products
    .map((p) => mapRawProduct(p))
    .filter((p): p is AliExpressProduct => !!p);

  return {
    products,
    total: extracted.total || products.length,
    page,
    pageSize,
  };
}

export async function getAffiliateProductDetails(
  productIds: string[],
  options: { shipToCountry?: string; targetCurrency?: string; targetLanguage?: string } = {}
): Promise<AliExpressProduct[]> {
  if (productIds.length === 0) return [];

  const { trackingId } = getCredentials();
  const biz: Record<string, string> = {
    product_ids: productIds.join(','),
    target_currency: options.targetCurrency || 'USD',
    target_language: options.targetLanguage || 'ES',
    ship_to_country: options.shipToCountry || 'PY',
  };
  if (trackingId) biz.tracking_id = trackingId;

  const payload = await callApi('aliexpress.affiliate.productdetail.get', biz);
  return extractDetail(payload)
    .map((p) => mapRawProduct(p))
    .filter((p): p is AliExpressProduct => !!p);
}

const MAX_AIR_WEIGHT_KG = 2;

function mapDsProductDetail(payload: any): AliExpressProduct | null {
  const result =
    payload?.aliexpress_ds_product_get_response?.result ||
    payload?.result ||
    payload;
  const base = result?.ae_item_base_info_dto || result?.ae_item_base_info || {};
  const productId = String(base.product_id || result?.product_id || '').trim();
  if (!productId) return null;

  const title = String(base.subject || base.product_title || '').trim();
  if (!title) return null;

  const skus = asArray(result?.ae_item_sku_info_dtos || result?.ae_item_sku_info);
  const inStock = skus.find((s: any) => s?.sku_stock !== false && parseMoney(s?.offer_sale_price || s?.sku_price) > 0) || skus[0];
  const salePrice = parseMoney(inStock?.offer_sale_price || inStock?.sku_price || base.price);
  const originalPrice = parseMoney(inStock?.sku_price);

  const media = result?.ae_multimedia_info_dto || {};
  const imageUrls = String(media.image_urls || '')
    .split(/[;,]/)
    .map((u: string) => u.trim())
    .filter((u: string) => u.startsWith('http'));

  const weight = parseFloat(String(result?.package_info_dto?.gross_weight || '0'));
  if (Number.isFinite(weight) && weight > MAX_AIR_WEIGHT_KG) {
    return null;
  }

  return {
    productId,
    title,
    description: base.detail ? String(base.detail).slice(0, 2000) : undefined,
    imageUrl: imageUrls[0] || null,
    imageUrls: imageUrls.slice(0, 8),
    productUrl: `https://www.aliexpress.com/item/${productId}.html`,
    salePrice,
    originalPrice: originalPrice > salePrice ? originalPrice : null,
    currency: String(inStock?.currency_code || base.currency_code || 'USD'),
    shippingPrice: 0,
    categoryId: base.category_id != null ? String(base.category_id) : undefined,
  };
}

export async function getDsFeedNames(): Promise<string[]> {
  const payload = await callApi('aliexpress.ds.feedname.get', {
    target_language: 'EN',
  });
  const result =
    payload?.aliexpress_ds_feedname_get_response?.resp_result?.result ||
    payload?.aliexpress_ds_feedname_get_response?.result ||
    payload?.resp_result?.result ||
    payload?.result;
  const promos = asArray(result?.promos?.promo || result?.promos);
  return promos
    .map((p: any) => String(p?.promo_name || p?.feed_name || '').trim())
    .filter(Boolean);
}

export async function getDsRecommendFeed(
  options: {
    categoryId?: string;
    feedName?: string;
    page?: number;
    pageSize?: number;
  },
  attempt = 1
): Promise<AliExpressSearchResult> {
  const page = options.page || 1;
  const pageSize = Math.min(Math.max(options.pageSize || 20, 1), 50);
  const biz: Record<string, string> = {
    feed_name: options.feedName || 'DS bestseller',
    country: 'US',
    target_currency: 'USD',
    target_language: 'ES',
    page_no: String(page),
    page_size: String(pageSize),
  };
  if (options.categoryId) biz.category_id = String(options.categoryId);

  const payload = await callApi('aliexpress.ds.recommend.feed.get', biz);
  const resp =
    payload?.aliexpress_ds_recommend_feed_get_response?.resp_result ||
    payload?.resp_result;
  const respCode = resp?.resp_code;
  if (respCode != null && Number(respCode) !== 0) {
    const msg = String(resp?.resp_msg || `Feed DS código ${respCode}`);
    const waitMs = parseAliExpressRateLimitWaitMs(msg);
    if (waitMs && attempt < 6) {
      logger.warn('[AliExpress] feed DS rate limit, reintento', { attempt, waitMs, categoryId: options.categoryId });
      await sleep(waitMs);
      return getDsRecommendFeed(options, attempt + 1);
    }
    throw new Error(msg);
  }

  const extracted = extractList(payload);
  const products = extracted.products
    .map((p) => mapRawProduct(p))
    .filter((p): p is AliExpressProduct => !!p)
    .map((p) => ({ ...p, categoryId: options.categoryId }));

  if (products.length === 0) {
    logger.warn('[AliExpress] feed DS vacío', {
      feedName: biz.feed_name,
      categoryId: options.categoryId || null,
      keys: payload && typeof payload === 'object' ? Object.keys(payload).slice(0, 8) : [],
    });
  }

  return {
    products,
    total: extracted.total || products.length,
    page,
    pageSize,
  };
}

export async function getDsProduct(productId: string): Promise<AliExpressProduct | null> {
  const payload = await callApi('aliexpress.ds.product.get', {
    product_id: String(productId),
    ship_to_country: 'PY',
    target_currency: 'USD',
    target_language: 'ES',
  });
  return mapDsProductDetail(payload);
}

export async function getSourcedProductDetails(productIds: string[]): Promise<AliExpressProduct[]> {
  if (productIds.length === 0) return [];
  try {
    return await getAffiliateProductDetails(productIds);
  } catch (error) {
    if (!isAliExpressPermissionError(error)) throw error;
    const out: AliExpressProduct[] = [];
    for (const id of productIds.slice(0, 15)) {
      try {
        const detail = await getDsProduct(id);
        if (detail) out.push(detail);
      } catch (inner) {
        logger.warn('[AliExpress] ds.product.get falló', { id, error: inner });
      }
    }
    return out;
  }
}
