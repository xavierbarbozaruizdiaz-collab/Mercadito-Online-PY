'use client';

// ============================================
// MERCADITO ONLINE PY - STATS SECTION
// Sección de estadísticas y números destacados
// ============================================

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Users, ShoppingBag, Gavel, Ticket } from 'lucide-react';

export default function StatsSection() {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalUsers: 0,
    activeAuctions: 0,
    activeRaffles: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
    
    // Actualizar cada 60 segundos
    const interval = setInterval(loadStats, 60000);
    return () => clearInterval(interval);
  }, []);

  async function loadStats() {
    try {
      const [productsCount, usersCount, auctionsCount, rafflesCount] = await Promise.all([
        supabase.from('products').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('sale_type', 'auction')
          .eq('auction_status', 'active'),
        supabase
          .from('raffles')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active')
          .eq('is_enabled', true),
      ]);

      setStats({
        totalProducts: productsCount.count || 0,
        totalUsers: usersCount.count || 0,
        activeAuctions: auctionsCount.count || 0,
        activeRaffles: rafflesCount.count || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <section className="py-12 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-white/20 rounded-lg"></div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  const statItems = [
    {
      icon: ShoppingBag,
      label: 'Productos',
      value: stats.totalProducts.toLocaleString('es-PY'),
      color: 'text-blue-300',
    },
    {
      icon: Users,
      label: 'Usuarios',
      value: stats.totalUsers.toLocaleString('es-PY'),
      color: 'text-green-300',
    },
    {
      icon: Gavel,
      label: 'Subastas Activas',
      value: stats.activeAuctions.toLocaleString('es-PY'),
      color: 'text-yellow-300',
    },
    {
      icon: Ticket,
      label: 'Sorteos Activos',
      value: stats.activeRaffles.toLocaleString('es-PY'),
      color: 'text-pink-300',
    },
  ];

  return (
    <section className="py-12 bg-gradient-to-r from-blue-600 via-purple-600 to-purple-700 text-white relative overflow-hidden">
      {/* Efecto de fondo decorativo */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full translate-x-1/2 translate-y-1/2"></div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-8">
          <h2 className="text-3xl sm:text-4xl font-bold mb-2">
            Mercadito Online PY en Números
          </h2>
          <p className="text-blue-100 text-lg">
            Conectando compradores y vendedores en todo Paraguay
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {statItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={index}
                className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 hover:bg-white/20 transition-all duration-300 hover:scale-105"
              >
                <div className="flex flex-col items-center text-center">
                  <div className={`mb-4 p-3 bg-white/10 rounded-full ${item.color}`}>
                    <Icon className="w-8 h-8" />
                  </div>
                  <div className="text-3xl sm:text-4xl font-bold mb-2">
                    {item.value}
                  </div>
                  <div className="text-blue-100 text-sm sm:text-base font-medium">
                    {item.label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

