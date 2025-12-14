'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export function PendingApprovalLink() {
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const response = await fetch('/api/auctions/pending-approval?limit=1&page=1');
        const result = await response.json();
        
        if (result.success && result.pagination) {
          setCount(result.pagination.total);
        }
      } catch (error) {
        // Silenciar errores - no crítico si falla
        console.warn('Error fetching pending approval count:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCount();
    
    // Refrescar cada 30 segundos
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Link 
      href="/dashboard/auctions/pending-approval" 
      className="text-gray-500 hover:text-gray-900 transition-colors relative"
    >
      Aprobaciones
      {!loading && count !== null && count > 0 && (
        <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}

