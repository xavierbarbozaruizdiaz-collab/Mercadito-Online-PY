// ============================================
// STORE LAYOUT
// Layout básico para páginas de tienda
// ============================================
// NOTA: Tracking se maneja vía GTM en layout.tsx principal.
// Si una tienda necesita tracking específico, debe configurarse en GTM.

import { Metadata } from 'next';

interface StoreLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: StoreLayoutProps): Promise<Metadata> {
  return {
    title: 'Tienda',
  };
}

export default async function StoreLayout({ children }: StoreLayoutProps) {
  // Layout simple: solo renderizar children
  // GTM del layout principal maneja todo el tracking
  return <>{children}</>;
}

