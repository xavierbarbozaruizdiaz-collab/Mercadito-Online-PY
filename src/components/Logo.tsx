'use client';

// ============================================
// MERCADITO ONLINE PY - LOGO COMPONENT
// Componente cliente para el logo con fallback
// ============================================

import { useState } from 'react';

interface LogoProps {
  className?: string;
}

export default function Logo({ className = '' }: LogoProps) {
  const [imageError, setImageError] = useState(false);

  return (
    <>
      {!imageError && (
        <img 
          src="/icons/icon-96x96.png" 
          alt="Mercadito Online PY" 
          className={`w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 object-contain flex-shrink-0 ${className}`}
          onError={() => {
            // Si falla la imagen, ocultarla y mostrar solo texto
            setImageError(true);
          }}
        />
      )}
    </>
  );
}








