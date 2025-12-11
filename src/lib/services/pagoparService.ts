// ============================================
// MERCADITO ONLINE PY - SERVICIO DE PAGOPAR
// Integración con la pasarela de pagos Pagopar de Paraguay
// ============================================

import { createHash } from 'crypto';
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
  external_reference?: string; // Referencia externa (orderId o subscriptionId)
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
  // NOTA: Según documentación de Pagopar, usan la misma URL para sandbox y producción
  // La diferencia está en los tokens (sandbox vs producción)
  // URL oficial de Pagopar: https://api.pagopar.com/api
  const baseUrl = 'https://api.pagopar.com/api';
  const fullUrl = `${baseUrl}/${endpoint}`;
  
  return fullUrl;
}

// ============================================
// FUNCIONES HELPER PARA LOGGING SANITIZADO
// ============================================

/**
 * Sanitiza un token mostrando solo los primeros 4 y últimos 4 caracteres
 */
function sanitizeToken(token: string | null | undefined): string | null {
  if (!token) return null;
  if (token.length <= 8) return '***';
  return `${token.slice(0, 4)}***${token.slice(-4)}`;
}

/**
 * Sanitiza el payload del comprador para logging (sin datos sensibles completos)
 */
function sanitizeBuyer(buyer: PagoparInvoice['comprador']): {
  razon_social: string;
  ruc: string;
  email: string;
  telefono: string;
} {
  return {
    razon_social: buyer.razon_social,
    ruc: buyer.ruc,
    email: buyer.email ? `${buyer.email.split('@')[0]}@***` : buyer.email, // Solo mostrar parte local del email
    telefono: buyer.telefono ? `${buyer.telefono.slice(0, 3)}***${buyer.telefono.slice(-2)}` : buyer.telefono,
  };
}

/**
 * Log del payload sanitizado (solo en servidor)
 */
function logSanitizedPayload(
  operation: 'create-token' | 'create-invoice',
  url: string,
  environment: 'sandbox' | 'production',
  method: string,
  bodySanitized: any
): void {
  // Solo loguear en servidor (no en cliente)
  if (typeof window !== 'undefined') return;

  console.error(`[pagopar][${operation}] payload`, {
    url,
    environment,
    method,
    bodySanitized,
  });
}

// ============================================
// FUNCIONES PRINCIPALES
// ============================================

/**
 * Generar token SHA1 para orden Pagopar según especificación oficial
 * token = sha1(privateToken + orderId + monto_total_normalizado)
 * 
 * @param privateToken - Token privado del comercio (PAGOPAR_PRIVATE_TOKEN)
 * @param orderId - ID del pedido en nuestra base de datos
 * @param totalAmountGs - Monto total en Guaraníes como entero (ej: 200000)
 * @returns Hash SHA1 del token combinado
 */
export function generatePagoparOrderToken({
  privateToken,
  orderId,
  totalAmountGs,
}: {
  privateToken: string;
  orderId: string | number;
  totalAmountGs: number;
}): string {
  // Validaciones
  if (!privateToken || !privateToken.trim()) {
    throw new Error('privateToken es requerido para generar token SHA1');
  }
  if (orderId === null || orderId === undefined || orderId === '') {
    throw new Error('orderId es requerido para generar token SHA1');
  }
  if (totalAmountGs === null || totalAmountGs === undefined || isNaN(totalAmountGs) || totalAmountGs <= 0) {
    throw new Error('totalAmountGs debe ser un número mayor a 0');
  }
  
  // Según documentación Pagopar: sha1(token_privado + idPedido + strval(floatval(monto_total)))
  // Convertir monto a float y luego a string (no redondear a entero)
  const montoTotalNormalizado = parseFloat(String(totalAmountGs)).toString();
  
  // Convertir orderId a string (debe ser exactamente igual al id_pedido_comercio)
  const orderIdStr = String(orderId);
  
  // Concatenar: privateToken + orderId + monto_total_normalizado
  const tokenString = privateToken + orderIdStr + montoTotalNormalizado;
  
  // Generar hash SHA1
  const hash = createHash('sha1');
  hash.update(tokenString);
  const tokenHash = hash.digest('hex');
  
  return tokenHash;
}

/**
 * Crear token de autenticación Pagopar
 */
export async function createPagoparToken(): Promise<PagoparToken> {
  try {
    const config = getConfig();
    
    // Validar que los tokens existen antes de hacer la llamada
    if (!config.publicToken || !config.privateToken) {
      throw new Error('Pagopar tokens no están configurados. Verifica las variables de entorno NEXT_PUBLIC_PAGOPAR_PUBLIC_TOKEN y PAGOPAR_PRIVATE_TOKEN');
    }

    const apiUrl = getApiUrl('token');
    
    // Logging detallado ANTES del request (sin exponer tokens)
    logger.info('[pagopar][create-token] request', {
      url: apiUrl,
      method: 'POST',
      environment: config.environment,
      hasPublicToken: !!config.publicToken,
      hasPrivateToken: !!config.privateToken,
      publicTokenLength: config.publicToken.length,
      publicTokenPreview: sanitizeToken(config.publicToken),
      // No exponer información del token privado
    });

    // Preparar payload (sin loguear valores completos por seguridad)
    const requestPayload = {
      public_key: config.publicToken,
      private_key: config.privateToken,
    };

    // Log del payload sanitizado ANTES del fetch
    logSanitizedPayload(
      'create-token',
      apiUrl,
      config.environment,
      'POST',
      {
        publicTokenPreview: sanitizeToken(config.publicToken),
        privateTokenPreview: sanitizeToken(config.privateToken),
      }
    );

    let response: Response;
    let responseBodyText: string;
    
    try {
      // Logging del request que se va a enviar (sin valores sensibles)
      logger.debug('[pagopar][create-token] sending request', {
        url: apiUrl,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        payloadKeys: Object.keys(requestPayload),
        payloadHasPublicKey: !!requestPayload.public_key,
        payloadHasPrivateKey: !!requestPayload.private_key,
      });

      response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
        // Timeout de 30 segundos
        signal: AbortSignal.timeout(30000),
      });
    } catch (fetchError: any) {
      // Error de red (timeout, conexión rechazada, DNS, etc.)
      logger.error('[pagopar][create-token] network error', {
        url: apiUrl,
        method: 'POST',
        errorType: fetchError?.name || 'unknown',
        message: fetchError?.message,
        stack: fetchError?.stack,
        environment: config.environment,
      });
      throw new Error(`Pagopar network error: ${fetchError?.message || 'Failed to connect to Pagopar API'}`);
    }

    // Leer el body como texto ANTES de verificar response.ok
    // Esto nos permite ver la respuesta exacta de Pagopar incluso si hay error
    try {
      responseBodyText = await response.text();
    } catch (readError: any) {
      logger.error('[pagopar][create-token] error reading response body', {
        error: readError?.message,
        status: response.status,
        statusText: response.statusText,
      });
      throw new Error(`Pagopar network error: Failed to read response body - ${readError?.message}`);
    }

    // Logging detallado de la respuesta (SIEMPRE, para debugging)
    logger.info('[pagopar][create-token] response', {
      url: apiUrl,
      method: 'POST',
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      isClientError: response.status >= 400 && response.status < 500,
      isServerError: response.status >= 500,
      bodyLength: responseBodyText.length,
      bodyPreview: responseBodyText.substring(0, 500), // Solo primeros 500 chars
      environment: config.environment,
    });

    // Log detallado de la respuesta (solo si hay error)
    if (!response.ok) {
      // Error de API (status >= 400)
      logger.error('[pagopar][create-token] API error response', {
        url: apiUrl,
        method: 'POST',
        status: response.status,
        statusText: response.statusText,
        bodyPreview: responseBodyText.substring(0, 500), // Solo primeros 500 chars
        bodyLength: responseBodyText.length,
        isClientError: response.status >= 400 && response.status < 500,
        isServerError: response.status >= 500,
        environment: config.environment,
      });
      
      // Intentar parsear el body como JSON para obtener errores más detallados
      let errorMessage = `Pagopar API error: ${response.status} ${response.statusText}`;
      try {
        const errorData = JSON.parse(responseBodyText);
        if (errorData.errores && Array.isArray(errorData.errores)) {
          errorMessage = `Pagopar API error (${response.status}): ${errorData.errores.join(', ')}`;
        } else if (errorData.mensaje) {
          errorMessage = `Pagopar API error (${response.status}): ${errorData.mensaje}`;
        } else if (errorData.error) {
          errorMessage = `Pagopar API error (${response.status}): ${errorData.error}`;
        }
      } catch (parseError) {
        // Si no es JSON válido, usar el texto crudo (truncado)
        errorMessage = `Pagopar API error (${response.status} ${response.statusText}): ${responseBodyText.substring(0, 200)}`;
      }
      
      throw new Error(errorMessage);
    }

    // Si response.ok es true, parsear el body como JSON
    const data: PagoparCreateTokenResponse = JSON.parse(responseBodyText);

    if (!data.resultado || !data.datos) {
      logger.error('[pagopar][create-token] invalid response structure', {
        resultado: data.resultado,
        hasDatos: !!data.datos,
        errores: data.errores,
        body: responseBodyText,
      });
      throw new Error(data.errores?.join(', ') || 'Error al crear token Pagopar');
    }

    return data.datos;
  } catch (err: any) {
    // Categorizar el error para mejor logging
    const errorType = err?.message?.includes('network error') 
      ? 'network' 
      : err?.message?.includes('API error') 
      ? 'api' 
      : 'unknown';
    
    logger.error('[pagopar][create-token] error creating token', {
      errorType,
      message: err?.message,
      stack: err?.stack,
    });
    
    // Re-lanzar el error para que lo manejen los callers
    throw err;
  }
}

/**
 * Crear factura en Pagopar
 */
export async function createPagoparInvoice(
  invoiceData: Omit<PagoparInvoice, 'token' | 'public_key'> & {
    orderId?: string | number;
    totalAmountGs?: number;
  }
): Promise<{ id_factura: number; link_pago: string; qr_code?: string }> {
  try {
    const config = getConfig();
    
    // Validar y normalizar monto_total (debe ser entero en Guaraníes)
    const montoTotal = Math.round(invoiceData.monto_total);
    if (montoTotal <= 0) {
      throw new Error('monto_total debe ser mayor a 0');
    }
    
    // Validar y normalizar items (precios deben ser enteros)
    const itemsNormalizados = invoiceData.items.map(item => ({
      concepto: item.concepto,
      cantidad: item.cantidad,
      precio: Math.round(item.precio), // Asegurar que sea entero
    }));
    
    // Validar que la suma de items coincida aproximadamente con monto_total
    const sumaItems = itemsNormalizados.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    const diferencia = Math.abs(sumaItems - montoTotal);
    if (diferencia > 100) { // Permitir diferencia de hasta 100 Gs. por redondeo
      logger.warn('[pagopar][create-invoice] monto_total no coincide con suma de items', {
        monto_total: montoTotal,
        sumaItems,
        diferencia,
      });
    }
    
    // Generar token SHA1 según especificación oficial de Pagopar
    // token = sha1(privateToken + orderId + monto_total_normalizado)
    let pagoparToken: string;
    if (invoiceData.orderId && invoiceData.totalAmountGs !== undefined) {
      // Usar el nuevo método con hash SHA1
      pagoparToken = generatePagoparOrderToken({
        privateToken: config.privateToken,
        orderId: invoiceData.orderId,
        totalAmountGs: invoiceData.totalAmountGs,
      });
      
      logger.info('[pagopar][create-invoice] using SHA1 token', {
        orderId: invoiceData.orderId,
        totalAmountGs: invoiceData.totalAmountGs,
        tokenLength: pagoparToken.length,
        tokenPreview: sanitizeToken(pagoparToken),
        tokenFirstChars: pagoparToken.substring(0, 10),
        tokenLastChars: pagoparToken.substring(pagoparToken.length - 10),
      });
    } else {
      // Fallback: usar el método anterior (token de autenticación)
      // Esto se mantiene para compatibilidad, pero debería usarse el método SHA1
      const token = await createPagoparToken();
      pagoparToken = token.token;
      
      logger.warn('[pagopar][create-invoice] using legacy token method (orderId/totalAmountGs not provided)');
    }
    
    // Extraer orderId y totalAmountGs del invoiceData (no deben ir en el payload a Pagopar)
    const { orderId: _orderId, totalAmountGs: _totalAmountGs, ...invoiceDataWithoutExtras } = invoiceData;
    
    const invoicePayload: PagoparInvoice = {
      ...invoiceDataWithoutExtras,
      monto_total: montoTotal,
      items: itemsNormalizados,
      token: pagoparToken,
      public_key: config.publicToken,
    };

    const apiUrl = getApiUrl('facturacion');
    
    // Log del payload sanitizado ANTES del fetch
    logSanitizedPayload(
      'create-invoice',
      apiUrl,
      config.environment,
      'POST',
      {
        monto_total: invoicePayload.monto_total,
        tipo_factura: invoicePayload.tipo_factura,
        items: invoicePayload.items.map(item => ({
          concepto: item.concepto,
          cantidad: item.cantidad,
          precio: item.precio,
        })),
        comprador: sanitizeBuyer(invoicePayload.comprador),
        fecha_vencimiento: invoicePayload.fecha_vencimiento,
        external_reference: invoicePayload.external_reference,
        venta: invoicePayload.venta,
        tokenPreview: sanitizeToken(invoicePayload.token), // Token SHA1 sanitizado
        publicTokenPreview: sanitizeToken(invoicePayload.public_key),
      }
    );
    
    // Logging detallado ANTES del request
    logger.info('[pagopar][create-invoice] request', {
      url: apiUrl,
      method: 'POST',
      environment: config.environment,
      monto_total: invoicePayload.monto_total,
      tipo_factura: invoicePayload.tipo_factura,
      itemsCount: invoicePayload.items.length,
      hasToken: !!invoicePayload.token,
      hasPublicKey: !!invoicePayload.public_key,
      tokenLength: invoicePayload.token?.length || 0,
      tokenPreview: sanitizeToken(invoicePayload.token), // Token SHA1 sanitizado
      publicKeyLength: invoicePayload.public_key?.length || 0,
      external_reference: invoicePayload.external_reference,
    });

    let response: Response;
    let responseBodyText: string;
    
    try {
      // Logging del payload (sin valores sensibles completos)
      logger.debug('[pagopar][create-invoice] sending request', {
        url: apiUrl,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        payload: {
          monto_total: invoicePayload.monto_total,
          tipo_factura: invoicePayload.tipo_factura,
          items: invoicePayload.items.map(item => ({
            concepto: item.concepto,
            cantidad: item.cantidad,
            precio: item.precio,
          })),
          comprador: {
            razon_social: invoicePayload.comprador.razon_social,
            ruc: invoicePayload.comprador.ruc,
            email: invoicePayload.comprador.email,
            telefono: invoicePayload.comprador.telefono,
          },
          fecha_vencimiento: invoicePayload.fecha_vencimiento,
          external_reference: invoicePayload.external_reference,
          hasToken: !!invoicePayload.token,
          hasPublicKey: !!invoicePayload.public_key,
        },
      });

      response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invoicePayload),
        // Timeout de 30 segundos
        signal: AbortSignal.timeout(30000),
      });
    } catch (fetchError: any) {
      // Error de red (timeout, conexión rechazada, DNS, etc.)
      logger.error('[pagopar][create-invoice] network error', {
        url: apiUrl,
        method: 'POST',
        errorType: fetchError?.name || 'unknown',
        message: fetchError?.message,
        stack: fetchError?.stack,
        environment: config.environment,
      });
      throw new Error(`Pagopar network error: ${fetchError?.message || 'Failed to connect to Pagopar API'}`);
    }

    // Leer el body como texto primero para mejor manejo de errores
    try {
      responseBodyText = await response.text();
    } catch (readError: any) {
      logger.error('[pagopar][create-invoice] error reading response body', {
        error: readError?.message,
        status: response.status,
        statusText: response.statusText,
      });
      throw new Error(`Pagopar network error: Failed to read response body - ${readError?.message}`);
    }

    // Logging detallado de la respuesta (SIEMPRE, para debugging)
    logger.info('[pagopar][create-invoice] response', {
      url: apiUrl,
      method: 'POST',
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      isClientError: response.status >= 400 && response.status < 500,
      isServerError: response.status >= 500,
      bodyLength: responseBodyText.length,
      bodyPreview: responseBodyText.substring(0, 500), // Solo primeros 500 chars
      environment: config.environment,
    });

    if (!response.ok) {
      // Error de API (status >= 400)
      logger.error('[pagopar][create-invoice] API error response', {
        url: apiUrl,
        method: 'POST',
        status: response.status,
        statusText: response.statusText,
        bodyPreview: responseBodyText.substring(0, 500), // Solo primeros 500 chars
        bodyLength: responseBodyText.length,
        isClientError: response.status >= 400 && response.status < 500,
        isServerError: response.status >= 500,
        environment: config.environment,
      });
      
      let errorMessage = `Pagopar API error: ${response.status} ${response.statusText}`;
      try {
        const errorData = JSON.parse(responseBodyText);
        if (errorData.errores && Array.isArray(errorData.errores)) {
          errorMessage = `Pagopar API error (${response.status}): ${errorData.errores.join(', ')}`;
        } else if (errorData.mensaje) {
          errorMessage = `Pagopar API error (${response.status}): ${errorData.mensaje}`;
        } else if (errorData.error) {
          errorMessage = `Pagopar API error (${response.status}): ${errorData.error}`;
        }
      } catch (parseError) {
        // Si no es JSON válido, usar el texto crudo (truncado)
        errorMessage = `Pagopar API error (${response.status} ${response.statusText}): ${responseBodyText.substring(0, 200)}`;
      }
      
      throw new Error(errorMessage);
    }

    const data: PagoparCreateInvoiceResponse = JSON.parse(responseBodyText);

    if (!data.resultado || !data.datos) {
      logger.error('[pagopar][create-invoice] invalid response structure', {
        resultado: data.resultado,
        hasDatos: !!data.datos,
        errores: data.errores,
        bodyFull: responseBodyText, // Log completo para debug
        requestPayload: {
          monto_total: invoicePayload.monto_total,
          tipo_factura: invoicePayload.tipo_factura,
          tokenLength: invoicePayload.token?.length,
          tokenPreview: sanitizeToken(invoicePayload.token),
          hasPublicKey: !!invoicePayload.public_key,
          external_reference: invoicePayload.external_reference,
        },
      });
      const errorMsg = data.errores?.join(', ') || 'Error al crear factura Pagopar';
      throw new Error(`${errorMsg} | Response: ${responseBodyText.substring(0, 200)}`);
    }

    logger.info('[pagopar][create-invoice] invoice created successfully', {
      id_factura: data.datos.id_factura,
      hasLinkPago: !!data.datos.link_pago,
    });

    return data.datos;
  } catch (err: any) {
    // Categorizar el error para mejor logging
    const errorType = err?.message?.includes('network error') 
      ? 'network' 
      : err?.message?.includes('API error') 
      ? 'api' 
      : 'unknown';
    
    logger.error('[pagopar][create-invoice] error creating invoice', {
      errorType,
      message: err?.message,
      stack: err?.stack,
    });
    
    // Re-lanzar el error para que lo manejen los callers
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
  // Pagopar requiere precios como enteros (Guaraníes sin decimales)
  // Math.round() asegura que no haya decimales
  return items.map(item => {
    const precioRedondeado = Math.round(item.price);
    if (precioRedondeado <= 0) {
      logger.warn('[pagopar][format-items] precio <= 0 detectado', {
        title: item.title,
        price: item.price,
        precioRedondeado,
      });
    }
    return {
      concepto: item.title,
      cantidad: item.quantity,
      precio: precioRedondeado,
    };
  });
}

/**
 * Calcular fecha de vencimiento (7 días por defecto)
 */
export function calculateDueDate(days: number = 7): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
}

