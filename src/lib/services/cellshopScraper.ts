// ============================================
// Cellshop category list scraper (Magento HTML)
// ============================================

export type CellshopListProduct = {
  title: string;
  pricePyg: number;
  imageUrl: string | null;
  sourceUrl: string;
};

const ALLOWED_HOSTS = new Set(['cellshop.com.py', 'www.cellshop.com.py']);

export function assertCellshopUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new Error('URL inválida');
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('La URL debe ser http(s)');
  }
  if (!ALLOWED_HOSTS.has(url.hostname.toLowerCase())) {
    throw new Error('Solo se permiten URLs de cellshop.com.py');
  }
  return url;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x20;/gi, ' ')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&aacute;/gi, 'á')
    .replace(/&eacute;/gi, 'é')
    .replace(/&iacute;/gi, 'í')
    .replace(/&oacute;/gi, 'ó')
    .replace(/&uacute;/gi, 'ú')
    .replace(/&ntilde;/gi, 'ñ')
    .replace(/&Aacute;/g, 'Á')
    .replace(/&Eacute;/g, 'É')
    .replace(/&Iacute;/g, 'Í')
    .replace(/&Oacute;/g, 'Ó')
    .replace(/&Uacute;/g, 'Ú')
    .replace(/&Ntilde;/g, 'Ñ');
}

function normalizeProductUrl(href: string): string | null {
  try {
    const u = new URL(href, 'https://cellshop.com.py');
    if (!ALLOWED_HOSTS.has(u.hostname.toLowerCase())) return null;
    u.hash = '';
    // Drop tracking query noise but keep path
    u.search = '';
    return u.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

function extractCategoryListHtml(html: string): string {
  const marker = 'products list items product-items';
  const idx = html.indexOf(marker);
  if (idx === -1) return html;
  // Take a window after the category product list marker
  return html.slice(Math.max(0, idx - 50), idx + 400_000);
}

/** Parse Magento product cards from a Cellshop category/list HTML page. */
export function parseCategoryProducts(html: string): CellshopListProduct[] {
  const scope = extractCategoryListHtml(html);
  const items = scope.split(/<li[^>]*class="[^"]*product-item[^"]*"/i).slice(1);
  const out: CellshopListProduct[] = [];
  const seen = new Set<string>();

  for (const chunk of items) {
    const hrefMatch =
      chunk.match(/class="product-item-link"\s*\n?\s*href="([^"]+)"/i) ||
      chunk.match(/class="product-item-link"[^>]*href="([^"]+)"/i) ||
      chunk.match(/href="([^"]+)"[^>]*class="product-item-link"/i) ||
      chunk.match(/class="product-item-photo"[^>]*href="([^"]+)"/i);

    const href = hrefMatch?.[1] || null;

    let title: string | null = null;
    const titled =
      chunk.match(/class="product-item-link"[^>]*title="([^"]+)"/i) ||
      chunk.match(/title="([^"]+)"[^>]*class="product-item-link"/i);
    if (titled) title = decodeEntities(titled[1]).trim();

    if (!title && href) {
      const textMatch = chunk.match(
        /class="product-item-link"[^>]*>\s*([\s\S]*?)\s*<\/a>/i
      );
      if (textMatch) {
        title = decodeEntities(textMatch[1].replace(/<[^>]+>/g, '')).trim();
      }
    }
    if (!title) {
      const alt = chunk.match(/class="product-image-photo"[^>]*alt="([^"]+)"/i);
      if (alt) title = decodeEntities(alt[1]).trim();
    }

    const priceMatch = chunk.match(/data-price-amount="(\d+(?:\.\d+)?)"/i);
    const pricePyg = priceMatch ? Math.round(Number(priceMatch[1])) : 0;

    const imgMatch =
      chunk.match(/class="product-image-photo"[^>]*src="([^"]+)"/i) ||
      chunk.match(/src="(https:\/\/cellshop\.com\.py\/media\/catalog\/product[^"]+)"/i);
    let imageUrl = imgMatch ? decodeEntities(imgMatch[1]) : null;
    if (imageUrl) imageUrl = imageUrl.replace(/&amp;/g, '&');

    const sourceUrl = href ? normalizeProductUrl(href) : null;
    if (!sourceUrl || !title || pricePyg <= 0) continue;
    if (seen.has(sourceUrl)) continue;
    seen.add(sourceUrl);

    out.push({
      title: title.slice(0, 200),
      pricePyg,
      imageUrl,
      sourceUrl,
    });
  }

  return out;
}

function withPage(url: URL, page: number): string {
  const u = new URL(url.toString());
  if (page <= 1) {
    u.searchParams.delete('p');
  } else {
    u.searchParams.set('p', String(page));
  }
  return u.toString();
}

export async function fetchCellshopCategory(
  categoryUrl: string,
  maxPages = 1
): Promise<{ products: CellshopListProduct[]; pagesFetched: number }> {
  const base = assertCellshopUrl(categoryUrl);
  const pages = Math.min(3, Math.max(1, Math.floor(maxPages) || 1));
  const all: CellshopListProduct[] = [];
  const seen = new Set<string>();
  let pagesFetched = 0;

  for (let p = 1; p <= pages; p++) {
    const pageUrl = withPage(base, p);
    const res = await fetch(pageUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; MercaditoLocalBot/1.0; +https://mercadito-online-py-swart.vercel.app)',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'es-PY,es;q=0.9',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(25_000),
    });

    if (!res.ok) {
      throw new Error(`Cellshop respondió ${res.status} al pedir la categoría`);
    }

    const html = await res.text();
    const parsed = parseCategoryProducts(html);
    pagesFetched += 1;

    let added = 0;
    for (const item of parsed) {
      if (seen.has(item.sourceUrl)) continue;
      seen.add(item.sourceUrl);
      all.push(item);
      added += 1;
    }

    // No more unique products → stop early
    if (added === 0) break;
  }

  if (all.length === 0) {
    throw new Error(
      'No se encontraron productos en esa URL. Abrí una categoría de Cellshop (listado), no la home.'
    );
  }

  return { products: all, pagesFetched };
}
