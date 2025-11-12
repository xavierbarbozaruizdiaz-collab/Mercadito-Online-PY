// ============================================
// MERCADITO ONLINE PY - SERVICIO DE PAGOPAR
// Integración con la pasarela de pagos Pagopar de Paraguay
// ============================================

import { logger } from '@/lib/utils/logger';

export interface PagoparConfig {
  publicToken: string;
  privateToken: string;
  environment: 'sandbox' | 'production';
}

export interface PagoparToken {
  token: string;
  public_key: string;
}

export interface PagoparInvoiceItem {
  concepto: string;
  cantidad: number;
  precio: number;
}

export interface PagoparInvoice {
  token: string;
  public_key: string;
  monto_total: number;
  tipo_factura: number; // 1 = Factura, 2 = Factura + Tarjeta
  comprador: {
    razon_social: string;
    ruc: string;
    email: string;
    telefono: string;
  };
  items: PagoparInvoiceItem[];
  fecha_vencimiento: string; // YYYY-MM-DD
  venta?: {
    forma_pago: number; // 1 = Contado, 2 = Cuotas
  };
}

export interface PagoparCreateTokenResponse {
  resultado: boolean;
  datos: PagoparToken;
  errores?: string[];
}

export interface PagoparCreateInvoiceResponse {
  resultado: boolean;
  datos: {
    id_factura: number;
    link_pago: string;
    qr_code?: string;
  };
  errores?: string[];
}

export interface PagoparInvoiceStatus {
  resultado: boolean;
  datos: {
    id_factura: number;
    estado: 'pendiente' | 'pagada' | 'vencida' | 'cancelada';
    monto_total: number;
    monto_pagado: number;
    fecha_pago?: string;
    metodo_pago?: string;
  };
  errores?: string[];
}

// ============================================
// CONFIGURACIÓN
// ============================================

function getConfig(): PagoparConfig {
  // Pagopar usa "Token Público" y "Token Privado"
  const publicToken = process.env.NEXT_PUBLIC_PAGOPAR_PUBLIC_TOKEN || process.env.PAGOPAR_PUBLIC_TOKEN || process.env.PAGOPAR_PUBLIC_KEY;
  const privateToken = process.env.PAGOPAR_PRIVATE_TOKEN || process.env.PAGOPAR_PRIVATE_KEY;
  const environment = (process.env.PAGOPAR_ENVIRONMENT || 'sandbox') as 'sandbox' | 'production';

  if (!publicToken || !privateToken) {
    throw new Error('Pagopar credentials not configured. Set PAGOPAR_PUBLIC_TOKEN and PAGOPAR_PRIVATE_TOKEN environment variables.');
  }

  return {
    publicToken,
    privateToken,
    environment,
  };
}

// ============================================
// URLS DE API
// ============================================

function getApiUrl(endpoint: string): string {
  // Pagopar usa la misma URL para sandbox y producción, pero diferentes tokens
  const baseUrl = 'https://api.pagopar.com/api';
  
  return `${baseUrl}/${endpoint}`;
}

// ============================================
// FUNCIONES PRINCIPALES
// ============================================

/**
 * Crear token de autenticación Pagopar
 */
export async function createPagoparToken(): Promise<PagoparToken> {
  try {
    
    const response = await fetch(getApiUrl('token'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        public_key: getConfig().publicToken,
        private_key: getConfig().privateToken,
      }),
    });

    if (!response.ok) {
      throw new Error(`Pagopar API error: ${response.status} ${response.statusText}`);
    }

    const data: PagoparCreateTokenResponse = await response.json();

    if (!data.resultado || !data.datos) {
      throw new Error(data.errores?.join(', ') || 'Error al crear token Pagopar');
    }

    return data.datos;
  } catch (err: any) {
    logger.error('Error creating Pagopar token', err);
    throw err;
  }
}

/**
 * Crear factura en Pagopar
 */
export async function createPagoparInvoice(
  invoiceData: Omit<PagoparInvoice, 'token' | 'public_key'>
): Promise<{ id_factura: number; link_pago: string; qr_code?: string }> {
  try {
    // Primero obtener token
    const token = await createPagoparToken();

    const invoicePayload: PagoparInvoice = {
      ...invoiceData,
      token: token.token,
      public_key: getConfig().publicToken,
    };

    const response = await fetch(getApiUrl('facturacion'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invoicePayload),
    });

    if (!response.ok) {
      throw new Error(`Pagopar API error: ${response.status} ${response.statusText}`);
    }

    const data: PagoparCreateInvoiceResponse = await response.json();

    if (!data.resultado || !data.datos) {
      throw new Error(data.errores?.join(', ') || 'Error al crear factura Pagopar');
    }

    logger.info('Pagopar invoice created', {
      id_factura: data.datos.id_factura,
      link_pago: data.datos.link_pago,
    });

    return data.datos;
  } catch (err: any) {
    logger.error('Error creating Pagopar invoice', err);
    throw err;
  }
}

/**
 * Consultar estado de factura
 */
export async function getPagoparInvoiceStatus(
  idFactura: number
): Promise<PagoparInvoiceStatus['datos']> {
  try {
    const token = await createPagoparToken();

    const response = await fetch(getApiUrl(`facturacion/${idFactura}`), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token.token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Pagopar API error: ${response.status} ${response.statusText}`);
    }

    const data: PagoparInvoiceStatus = await response.json();

    if (!data.resultado || !data.datos) {
      throw new Error(data.errores?.join(', ') || 'Error al consultar estado de factura');
    }

    return data.datos;
  } catch (err: any) {
    logger.error('Error getting Pagopar invoice status', err);
    throw err;
  }
}

/**
 * Formatear comprador para Pagopar
 */
export function formatPagoparBuyer(
  buyerData: {
    fullName: string;
    email: string;
    phone: string;
    ruc?: string; // RUC es opcional, si no tiene se usa CI
  }
): PagoparInvoice['comprador'] {
  return {
    razon_social: buyerData.fullName,
    ruc: buyerData.ruc || '0', // Si no tiene RUC, usar 0 (comprador particular)
    email: buyerData.email,
    telefono: buyerData.phone.replace(/\D/g, ''), // Solo números
  };
}

/**
 * Formatear items para Pagopar
 */
export function formatPagoparItems(
  items: Array<{
    title: string;
    quantity: number;
    price: number;
  }>
): PagoparInvoiceItem[] {
  return items.map(item => ({
    concepto: item.title,
    cantidad: item.quantity,
    precio: Math.round(item.price), // Pagopar usa enteros (Guaraníes)
  }));
}

/**
 * Calcular fecha de vencimiento (7 días por defecto)
 */
export function calculateDueDate(days: number = 7): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
}

