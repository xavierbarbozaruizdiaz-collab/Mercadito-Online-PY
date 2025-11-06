/**
 * Script helper para reemplazar @ts-ignore después de generar tipos de Supabase
 * 
 * USO:
 * 1. Ejecutar: npm run typegen
 * 2. Revisar este script y ajustar según tus tipos generados
 * 3. Ejecutar manualmente los reemplazos
 * 
 * NOTA: Este es un script de referencia, no ejecutable directamente.
 * Copia y pega los reemplazos en los archivos correspondientes.
 */

// ============================================
// 1. src/app/admin/reports/page.tsx
// ============================================
/*
// ANTES:
// @ts-ignore - Supabase types for reports table are incomplete
const { error } = await supabase
  .from('reports')
  // @ts-ignore
  .update({
    status: resolution,
    resolved_by: user.id,
    resolved_at: new Date().toISOString(),
    resolution_notes: resolutionNotes,
  })
  .eq('id', selectedReport.id);

// DESPUÉS:
import type { Database } from '@/types/supabase';
type ReportsUpdate = Database['public']['Tables']['reports']['Update'];

const { error } = await supabase
  .from('reports')
  .update<ReportsUpdate>({
    status: resolution,
    resolved_by: user.id,
    resolved_at: new Date().toISOString(),
    resolution_notes: resolutionNotes,
  })
  .eq('id', selectedReport.id);
*/

// ============================================
// 2. src/app/api/whatsapp/notify-seller/route.ts
// ============================================
/*
// ANTES:
// @ts-ignore - Supabase types may be incomplete
const sellerName = `${(sellerProfile as any).first_name || ''} ${(sellerProfile as any).last_name || ''}`.trim() || 'Vendedor';
// @ts-ignore - Supabase types for order_items are incomplete
const orderItems = ((orderDetails as any).order_items || [])
  .map((item: any) => `• ${item.product.title} x${item.quantity} - ${item.total_price.toLocaleString('es-PY')} Gs.`)
  .join('\n');

// DESPUÉS:
import type { Database } from '@/types/supabase';
type Profile = Database['public']['Tables']['profiles']['Row'];
type Order = Database['public']['Tables']['orders']['Row'] & {
  order_items: Array<{
    quantity: number;
    total_price: number;
    product: { title: string };
  }>;
};

const sellerName = `${(sellerProfile as Profile).first_name || ''} ${(sellerProfile as Profile).last_name || ''}`.trim() || 'Vendedor';
const orderItems = ((orderDetails as Order).order_items || [])
  .map((item) => `• ${item.product.title} x${item.quantity} - ${item.total_price.toLocaleString('es-PY')} Gs.`)
  .join('\n');

// También reemplazar:
Total: ${((orderDetails as Order).total_amount || 0).toLocaleString('es-PY')} Gs.
*/

// ============================================
// 3. src/app/admin/orders/page.tsx
// ============================================
/*
// ANTES:
return data ? { id: (data as { id: string; email: string }).id, email: (data as { id: string; email: string }).email } : null;

// DESPUÉS:
import type { Database } from '@/types/supabase';
type Profile = Database['public']['Tables']['profiles']['Row'];

return data ? { id: data.id, email: data.email } : null;
// TypeScript ya debería inferir correctamente si los tipos están bien
*/

export {};

