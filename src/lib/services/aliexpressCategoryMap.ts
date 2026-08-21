// AliExpress first-level category_id → aliases of Mercadito category names.
// UUIDs se resuelven en runtime contra public.categories (el admin puede haber
// agregado o renombrado).

export type MercaditoCategory = { id: string; name: string };

export type AliExpressCategoryFeed = {
  aeCategoryId: string;
  aeName: string;
  labelEs: string;
  mercaditoAliases: string[];
  /** Poco apto para envío aéreo (voluminoso o pesado). */
  heavyAir?: boolean;
};

function norm(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Rubros top-level de AliExpress DS. Comida/muebles grandes no están. */
export const ALIEXPRESS_CATEGORY_FEEDS: AliExpressCategoryFeed[] = [
  { aeCategoryId: '3', aeName: 'Apparel & Accessories', labelEs: 'Ropa y accesorios', mercaditoAliases: ['ropa y calzado', 'ropa y accesorios', 'ropa', 'accesorios'] },
  { aeCategoryId: '322', aeName: 'Shoes', labelEs: 'Calzado', mercaditoAliases: ['ropa y calzado', 'calzado', 'zapatos'] },
  { aeCategoryId: '200001075', aeName: 'Underwear', labelEs: 'Ropa interior', mercaditoAliases: ['ropa y calzado', 'ropa'] },
  { aeCategoryId: '44', aeName: 'Consumer Electronics', labelEs: 'Electrónica (varios)', mercaditoAliases: ['electronica', 'electronicos'] },
  { aeCategoryId: '380230', aeName: 'Earphones & Headphones', labelEs: 'Auriculares', mercaditoAliases: ['electronica', 'electronicos'] },
  { aeCategoryId: '7', aeName: 'Computer & Office', labelEs: 'Computación', mercaditoAliases: ['electronica', 'electronicos'] },
  { aeCategoryId: '509', aeName: 'Phones & Telecommunications', labelEs: 'Celulares', mercaditoAliases: ['electronica', 'electronicos'] },
  { aeCategoryId: '530', aeName: 'Electronic Components', labelEs: 'Componentes electrónicos', mercaditoAliases: ['electronica', 'electronicos'] },
  { aeCategoryId: '30', aeName: 'Security & Protection', labelEs: 'Seguridad', mercaditoAliases: ['electronica', 'electronicos', 'herramientas'] },
  { aeCategoryId: '66', aeName: 'Beauty & Health', labelEs: 'Belleza y salud', mercaditoAliases: ['belleza y salud', 'accesorios'] },
  { aeCategoryId: '1511', aeName: 'Watches', labelEs: 'Relojes', mercaditoAliases: ['accesorios'] },
  { aeCategoryId: '36', aeName: 'Jewelry & Accessories', labelEs: 'Joyería', mercaditoAliases: ['accesorios'] },
  { aeCategoryId: '201355635', aeName: 'Hair Extensions & Wigs', labelEs: 'Extensiones y pelucas', mercaditoAliases: ['belleza y salud', 'accesorios'] },
  { aeCategoryId: '26', aeName: 'Toys & Hobbies', labelEs: 'Juguetes', mercaditoAliases: ['juguetes', 'juguetes y juegos'] },
  { aeCategoryId: '1503', aeName: 'Mother & Kids', labelEs: 'Bebés y niños', mercaditoAliases: ['juguetes', 'juguetes y juegos'] },
  { aeCategoryId: '21', aeName: 'Office & School Supplies', labelEs: 'Oficina y útiles', mercaditoAliases: ['libros', 'libros y musica', 'accesorios'] },
  { aeCategoryId: '200000345', aeName: 'Weddings & Events', labelEs: 'Eventos', mercaditoAliases: ['accesorios'] },
  { aeCategoryId: '18', aeName: 'Sports & Entertainment', labelEs: 'Deportes', mercaditoAliases: ['deportes', 'deportes y fitness'] },
  { aeCategoryId: '39', aeName: 'Lights & Lighting', labelEs: 'Iluminación (puede ser voluminoso)', mercaditoAliases: ['hogar', 'hogar y jardin'], heavyAir: true },
  { aeCategoryId: '1420', aeName: 'Tools', labelEs: 'Herramientas (puede ser pesado)', mercaditoAliases: ['herramientas'], heavyAir: true },
  { aeCategoryId: '13', aeName: 'Home Improvement', labelEs: 'Ferretería / construcción', mercaditoAliases: ['herramientas', 'hogar', 'hogar y jardin'], heavyAir: true },
  { aeCategoryId: '6', aeName: 'Home Appliances', labelEs: 'Electrodomésticos', mercaditoAliases: ['hogar', 'hogar y jardin'], heavyAir: true },
  { aeCategoryId: '15', aeName: 'Home & Garden', labelEs: 'Hogar y jardín', mercaditoAliases: ['hogar', 'hogar y jardin'], heavyAir: true },
  { aeCategoryId: '5', aeName: 'Electrical Equipment', labelEs: 'Equipo eléctrico industrial', mercaditoAliases: ['herramientas', 'electronica', 'electronicos'], heavyAir: true },
  { aeCategoryId: '34', aeName: 'Automobiles & Motorcycles', labelEs: 'Automotriz', mercaditoAliases: ['autos', 'automotriz', 'motos'], heavyAir: true },
];

export function defaultAirFriendlyCategoryIds(): string[] {
  return ALIEXPRESS_CATEGORY_FEEDS.filter((f) => !f.heavyAir).map((f) => f.aeCategoryId);
}

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
