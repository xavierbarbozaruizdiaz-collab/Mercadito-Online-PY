'use client';

// ============================================
// MERCADITO ONLINE PY - FOOTER COMPONENT
// Footer completo con links, redes sociales y información
// ============================================

import Link from 'next/link';
import { Facebook, Instagram, Twitter, Mail, Phone, MapPin } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Sección 1: Acerca de */}
          <div>
            <h3 className="text-white text-lg font-bold mb-4">Mercadito Online PY</h3>
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
                <Link href="/products" className="hover:text-white transition-colors">
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
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                <a href="mailto:contacto@mercadito-online-py.com" className="hover:text-white transition-colors">
                  contacto@mercadito-online-py.com
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                <a href="tel:+595981234567" className="hover:text-white transition-colors">
                  +595 981 234 567
                </a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-1 flex-shrink-0" />
                <span>Asunción, Paraguay</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Línea divisoria */}
        <div className="border-t border-gray-800 mt-8 pt-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm">
            <p>
              © {currentYear} Mercadito Online PY. Todos los derechos reservados.
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

