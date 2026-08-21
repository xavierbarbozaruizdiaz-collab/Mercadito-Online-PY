// AliExpress first-level category_id → aliases of Mercadito category names.
// UUIDs se resuelven en runtime contra public.categories (el admin puede haber
// agregado o renombrado).

export type MercaditoCategory = { id: string; name: string };

export type AliExpressCategoryFeed = {
  aeCategoryId: string;
  aeName: string;
  mercaditoAliases: string[];
  skipAir?: boolean;
};

function norm(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Máximo de rubros top-level de AliExpress DS, salvo comida/muebles (malos para avión). */
export const ALIEXPRESS_CATEGORY_FEEDS: AliExpressCategoryFeed[] = [
  { aeCategoryId: '3', aeName: 'Apparel & Accessories', mercaditoAliases: ['ropa y calzado', 'ropa y accesorios', 'ropa', 'accesorios'] },
  { aeCategoryId: '322', aeName: 'Shoes', mercaditoAliases: ['ropa y calzado', 'calzado', 'zapatos'] },
  { aeCategoryId: '200001075', aeName: 'Underwear', mercaditoAliases: ['ropa y calzado', 'ropa'] },
  { aeCategoryId: '34', aeName: 'Automobiles & Motorcycles', mercaditoAliases: ['autos', 'automotriz', 'motos'] },
  { aeCategoryId: '44', aeName: 'Consumer Electronics', mercaditoAliases: ['electronica', 'electronicos'] },
  { aeCategoryId: '7', aeName: 'Computer & Office', mercaditoAliases: ['electronica', 'electronicos'] },
  { aeCategoryId: '509', aeName: 'Phones & Telecommunications', mercaditoAliases: ['electronica', 'electronicos'] },
  { aeCategoryId: '530', aeName: 'Electronic Components', mercaditoAliases: ['electronica', 'electronicos'] },
  { aeCategoryId: '30', aeName: 'Security & Protection', mercaditoAliases: ['electronica', 'electronicos', 'herramientas'] },
  { aeCategoryId: '6', aeName: 'Home Appliances', mercaditoAliases: ['hogar', 'hogar y jardin'] },
  { aeCategoryId: '15', aeName: 'Home & Garden', mercaditoAliases: ['hogar', 'hogar y jardin'] },
  { aeCategoryId: '13', aeName: 'Home Improvement', mercaditoAliases: ['herramientas', 'hogar', 'hogar y jardin'] },
  { aeCategoryId: '39', aeName: 'Lights & Lighting', mercaditoAliases: ['hogar', 'hogar y jardin'] },
  { aeCategoryId: '18', aeName: 'Sports & Entertainment', mercaditoAliases: ['deportes', 'deportes y fitness'] },
  { aeCategoryId: '26', aeName: 'Toys & Hobbies', mercaditoAliases: ['juguetes', 'juguetes y juegos'] },
  { aeCategoryId: '1503', aeName: 'Mother & Kids', mercaditoAliases: ['juguetes', 'juguetes y juegos'] },
  { aeCategoryId: '1420', aeName: 'Tools', mercaditoAliases: ['herramientas'] },
  { aeCategoryId: '5', aeName: 'Electrical Equipment', mercaditoAliases: ['herramientas', 'electronica', 'electronicos'] },
  { aeCategoryId: '66', aeName: 'Beauty & Health', mercaditoAliases: ['belleza y salud', 'accesorios'] },
  { aeCategoryId: '36', aeName: 'Jewelry & Watches', mercaditoAliases: ['accesorios'] },
  { aeCategoryId: '21', aeName: 'Office & School Supplies', mercaditoAliases: ['libros', 'libros y musica', 'accesorios'] },
  { aeCategoryId: '200000345', aeName: 'Weddings & Events', mercaditoAliases: ['accesorios'] },
  { aeCategoryId: '201355635', aeName: 'Hair Extensions & Wigs', mercaditoAliases: ['belleza y salud', 'accesorios'] },
];

const FALLBACK_ALIASES = ['accesorios', 'otros', 'electronica', 'electronicos'];

export function matchMercaditoCategory(
  categories: MercaditoCategory[],
  aliases: string[]
): MercaditoCategory | null {
  const indexed = categories.map((c) => ({ cat: c, key: norm(c.name) }));
  for (const alias of aliases) {
    const needle = norm(alias);
    const exact = indexed.find((c) => c.key === needle);
    if (exact) return exact.cat;
    const partial = indexed.find(
      (c) => c.key.includes(needle) || needle.includes(c.key)
    );
    if (partial) return partial.cat;
  }
  return null;
}

export function resolveAliExpressFeeds(categories: MercaditoCategory[]): Array<{
  aeCategoryId: string;
  aeName: string;
  mercadito: MercaditoCategory;
}> {
  const fallback =
    matchMercaditoCategory(categories, FALLBACK_ALIASES) || categories[0] || null;

  const resolved: Array<{
    aeCategoryId: string;
    aeName: string;
    mercadito: MercaditoCategory;
  }> = [];
  const used = new Set<string>();

  for (const feed of ALIEXPRESS_CATEGORY_FEEDS) {
    if (feed.skipAir) continue;
    const mercadito = matchMercaditoCategory(categories, feed.mercaditoAliases) || fallback;
    if (!mercadito) continue;
    const key = `${feed.aeCategoryId}:${mercadito.id}`;
    if (used.has(key)) continue;
    used.add(key);
    resolved.push({
      aeCategoryId: feed.aeCategoryId,
      aeName: feed.aeName,
      mercadito,
    });
  }

  return resolved;
}
