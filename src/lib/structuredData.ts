// ============================================
// MERCADITO ONLINE PY - STRUCTURED DATA
// Schema.org para SEO mejorado
// ============================================

export interface ProductStructuredData {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  image: string;
  condition: string;
  availability: string;
  seller: {
    name: string;
    url: string;
  };
  category: string;
  brand?: string;
  sku?: string;
}

export interface StoreStructuredData {
  id: string;
  name: string;
  description: string;
  url: string;
  logo: string;
  address?: {
    streetAddress: string;
    addressLocality: string;
    addressCountry: string;
  };
  contactPoint?: {
    telephone: string;
    email: string;
  };
  aggregateRating?: {
    ratingValue: number;
    reviewCount: number;
  };
}

export interface OrganizationStructuredData {
  name: string;
  url: string;
  logo: string;
  description: string;
  contactPoint: {
    telephone: string;
    email: string;
  };
  address: {
    streetAddress: string;
    addressLocality: string;
    addressCountry: string;
  };
  sameAs: string[];
}

// Generar structured data para producto
export function generateProductStructuredData(product: ProductStructuredData) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description,
    image: product.image,
    sku: product.sku || product.id,
    brand: product.brand ? {
      '@type': 'Brand',
      name: product.brand,
    } : undefined,
    category: product.category,
    condition: product.condition,
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: product.currency,
      availability: `https://schema.org/${product.availability}`,
      seller: {
        '@type': 'Organization',
        name: product.seller.name,
        url: product.seller.url,
      },
    },
  };
}

// Generar structured data para tienda
export function generateStoreStructuredData(store: StoreStructuredData) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Store',
    name: store.name,
    description: store.description,
    url: store.url,
    logo: store.logo,
    address: store.address ? {
      '@type': 'PostalAddress',
      streetAddress: store.address.streetAddress,
      addressLocality: store.address.addressLocality,
      addressCountry: store.address.addressCountry,
    } : undefined,
    contactPoint: store.contactPoint ? {
      '@type': 'ContactPoint',
      telephone: store.contactPoint.telephone,
      email: store.contactPoint.email,
    } : undefined,
    aggregateRating: store.aggregateRating ? {
      '@type': 'AggregateRating',
      ratingValue: store.aggregateRating.ratingValue,
      reviewCount: store.aggregateRating.reviewCount,
    } : undefined,
  };
}

// Generar structured data para organización
export function generateOrganizationStructuredData(org: OrganizationStructuredData) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: org.name,
    url: org.url,
    logo: org.logo,
    description: org.description,
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: org.contactPoint.telephone,
      email: org.contactPoint.email,
    },
    address: {
      '@type': 'PostalAddress',
      streetAddress: org.address.streetAddress,
      addressLocality: org.address.addressLocality,
      addressCountry: org.address.addressCountry,
    },
    sameAs: org.sameAs,
  };
}

// Generar breadcrumb structured data
export function generateBreadcrumbStructuredData(items: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

// Generar FAQ structured data
export function generateFAQStructuredData(faqs: Array<{ question: string; answer: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}
