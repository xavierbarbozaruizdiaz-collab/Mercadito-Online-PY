'use client';

// ============================================
// MERCADITO ONLINE PY - FOOTER COMPONENT
// Footer completo con links, redes sociales y información
// ============================================

import Link from 'next/link';
import { Facebook, Instagram, Twitter, Mail, Phone, MapPin } from 'lucide-react';

interface FooterProps {
  siteName: string;
  contactEmail: string | null;
  contactPhone: string | null;
  location?: string | null;
}

export default function Footer({ 
  siteName,
  contactEmail,
  contactPhone,
  location
}: FooterProps) {
  const currentYear = new Date().getFullYear();
  const enableProductsApi = process.env.NEXT_PUBLIC_ENABLE_PRODUCTS_API === 'true';
  const productsHref = enableProductsApi ? '/products' : '/vitrina';

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Sección 1: Acerca de */}
          <div>
            <h3 className="text-white text-lg font-bold mb-4">{siteName}</h3>
            <p className="text-sm mb-4">
              El mejor marketplace de Paraguay. Compra y vende productos nuevos y usados de forma segura.
            </p>
            <div className="flex space-x-4">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-blue-400 transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-pink-400 transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-blue-400 transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Sección 2: Enlaces rápidos */}
          <div>
            <h3 className="text-white text-lg font-bold mb-4">Enlaces Rápidos</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/" className="hover:text-white transition-colors">
                  Inicio
                </Link>
              </li>
              <li>
                <Link
                  href={productsHref}
                  prefetch={enableProductsApi}
                  aria-disabled={!enableProductsApi}
                  className="hover:text-white transition-colors"
                >
                  Productos
                </Link>
              </li>
              <li>
                <Link href="/auctions" className="hover:text-white transition-colors">
                  Subastas
                </Link>
              </li>
              <li>
                <Link href="/raffles" className="hover:text-white transition-colors">
                  Sorteos
                </Link>
              </li>
              <li>
                <Link href="/stores" className="hover:text-white transition-colors">
                  Tiendas
                </Link>
              </li>
            </ul>
          </div>

          {/* Sección 3: Para vendedores */}
          <div>
            <h3 className="text-white text-lg font-bold mb-4">Para Vendedores</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/dashboard" className="hover:text-white transition-colors">
                  Panel de Vendedor
                </Link>
              </li>
              <li>
                <Link href="/dashboard/new-product" className="hover:text-white transition-colors">
                  Vender Producto
                </Link>
              </li>
              <li>
                <Link href="/orders" className="hover:text-white transition-colors">
                  Mis Pedidos
                </Link>
              </li>
            </ul>
          </div>

          {/* Sección 4: Contacto */}
          <div>
            <h3 className="text-white text-lg font-bold mb-4">Contacto</h3>
            <ul className="space-y-3 text-sm">
              {contactEmail && (
                <li className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  <a href={`mailto:${contactEmail}`} className="hover:text-white transition-colors">
                    {contactEmail}
                  </a>
                </li>
              )}
              {contactPhone && (
                <li className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  <div className="flex items-center gap-2">
                    <a 
                      href={`tel:${contactPhone.replace(/\s/g, '')}`} 
                      className="hover:text-white transition-colors"
                    >
                      {contactPhone}
                    </a>
                    <a
                      href={`https://wa.me/${contactPhone.replace(/[^\d]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-green-400 transition-colors"
                      aria-label="WhatsApp"
                      title="Contactar por WhatsApp"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.375a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .96 4.534.96 9.98c0 1.76.413 3.42 1.147 4.88L.06 24l9.31-2.45a11.88 11.88 0 005.68 1.45h.005c5.554 0 10.089-4.534 10.089-10.088 0-2.688-1.06-5.216-2.987-7.113z"/>
                      </svg>
                    </a>
                  </div>
                </li>
              )}
              {location && (
                <li className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 mt-1 flex-shrink-0" />
                  <span>{location}</span>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Línea divisoria */}
        <div className="border-t border-gray-800 mt-8 pt-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm">
            <p>
              © {currentYear} {siteName}. Todos los derechos reservados.
            </p>
            <div className="flex gap-6">
              <Link href="/terms" className="hover:text-white transition-colors">
                Términos y Condiciones
              </Link>
              <Link href="/privacy" className="hover:text-white transition-colors">
                Política de Privacidad
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

