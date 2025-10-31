// Layout específico para páginas de vendedor - sin header principal
'use client';

import { useEffect } from 'react';

export default function SellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Ocultar header global cuando estés en página de seller
    const header = document.querySelector('header');
    if (header) {
      header.style.display = 'none';
    }
    
    return () => {
      // Restaurar header al salir
      if (header) {
        header.style.display = '';
      }
    };
  }, []);

  return (
    <div className="seller-page">
      {children}
    </div>
  );
}

