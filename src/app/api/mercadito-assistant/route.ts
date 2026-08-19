// ============================================
// MERCADITO ONLINE PY - ASISTENTE API
// Endpoint para el chat del asistente oficial
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// ============================================
// DIAGNÓSTICO Y CAUSA RAÍZ DEL ERROR 500
// ============================================
// Posibles causas:
// 1. OPENAI_API_KEY no está configurada en .env.local o no se cargó al iniciar el servidor
// 2. La API key es inválida o expiró
// 3. El modelo solicitado no está disponible en la cuenta
// 4. Error de red al conectar con la API de OpenAI
// 5. El SDK de OpenAI no está instalado correctamente
// ============================================

const SYSTEM_PROMPT = `Eres el Asistente Oficial de Mercadito Online PY, el marketplace del Paraguay para comprar, vender, subastar y administrar tiendas en línea.

Tu rol principal:
1. Ayudar a compradores a encontrar productos, entender cómo comprar, pagar, hacer seguimiento de envíos y participar en subastas.
2. Ayudar a vendedores a crear tiendas, publicar productos, entender comisiones, membresías, catálogo de anuncios y manejo de pedidos.
3. Explicar cómo funciona Mercadito Online PY en general (subastas, tiendas, métodos de pago, seguridad, etc.).

Reglas:
- Responde siempre en español paraguayo neutral, claro y directo.
- Da pasos concretos cuando expliques algo.
- Si el usuario pregunta algo que la plataforma todavía no tiene, respondé: "Esa función está en desarrollo por el equipo de Mercadito Online PY."
- No inventes datos sensibles (montos exactos, políticas legales específicas) si no estás seguro; hablá en términos generales.`;

export async function POST(request: NextRequest) {
  try {
    // ============================================
    // VALIDACIÓN INICIAL Y DIAGNÓSTICO
    // ============================================
    console.log('=== Iniciando /api/mercadito-assistant ===');
    
    // Validar OPENAI_API_KEY al inicio (CRÍTICO)
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('❌ OPENAI_API_KEY no está configurada en el servidor');
      console.error('Verifica que existe en .env.local y reinicia el servidor con: npm run dev');
      return NextResponse.json(
        { error: 'OPENAI_API_KEY no está configurada en el servidor' },
        { status: 500 }
      );
    }
    
    console.log('✅ OPENAI_API_KEY encontrada, longitud:', apiKey.length);
    console.log('✅ Primeros caracteres (para verificación):', apiKey.substring(0, 7) + '...');
    
    // Parsear el body de la solicitud
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('❌ Error al parsear JSON:', parseError);
      return NextResponse.json(
        { error: 'Error al parsear el cuerpo de la solicitud' },
        { status: 400 }
      );
    }
    
    const { messages } = body;
    console.log('✅ Mensajes recibidos:', messages?.length || 0);

    // Validar que messages existe y es un array
    if (!Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'messages debe ser un array' },
        { status: 400 }
      );
    }

    // Validar que cada mensaje tiene role y content
    for (const msg of messages) {
      if (!msg.role || !msg.content) {
        return NextResponse.json(
          { error: 'Cada mensaje debe tener role y content' },
          { status: 400 }
        );
      }
      if (!['user', 'assistant', 'system'].includes(msg.role)) {
        return NextResponse.json(
          { error: 'role debe ser "user", "assistant" o "system"' },
          { status: 400 }
        );
      }
    }

    // ============================================
    // INICIALIZACIÓN DEL CLIENTE DE OPENAI
    // ============================================
    // La API key ya fue validada arriba
    let openai: OpenAI;
    try {
      openai = new OpenAI({
        apiKey: apiKey,
      });
      console.log('✅ Cliente de OpenAI inicializado correctamente');
    } catch (initError) {
      console.error('❌ Error al inicializar cliente de OpenAI:', initError);
      return NextResponse.json(
        { error: 'Error al configurar el cliente de OpenAI' },
        { status: 500 }
      );
    }

    // Preparar mensajes con el system prompt
    const chatMessages = [
      { role: 'system' as const, content: SYSTEM_PROMPT },
      ...messages.map((msg: { role: string; content: string }) => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
      })),
    ];

    // ============================================
    // LLAMADA A LA API DE OPENAI
    // ============================================
    // Intentar con gpt-4o primero (modelo solicitado originalmente)
    // Si falla, usar gpt-3.5-turbo como fallback
    console.log('📞 Llamando a OpenAI con modelo gpt-4o...');
    let completion;
    
    try {
      completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: chatMessages,
      });
      console.log('✅ Respuesta de OpenAI recibida (gpt-4o)');
    } catch (modelError: any) {
      console.warn('⚠️ Error con gpt-4o:', modelError?.message || 'Error desconocido');
      console.warn('🔄 Intentando con gpt-3.5-turbo como fallback...');
      
      try {
        completion = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: chatMessages,
        });
        console.log('✅ Respuesta de OpenAI recibida (gpt-3.5-turbo)');
      } catch (fallbackError: any) {
        console.error('❌ Error también con gpt-3.5-turbo:', fallbackError?.message || 'Error desconocido');
        throw fallbackError; // Re-lanzar para que se maneje en el catch principal
      }
    }

    const answer = completion.choices[0]?.message?.content || 'No se pudo generar una respuesta.';

    return NextResponse.json({ answer });
  } catch (error) {
    // ============================================
    // MANEJO DETALLADO DE ERRORES
    // ============================================
    console.error('❌ Error en /api/mercadito-assistant');
    console.error('Error completo:', error);
    
    // Log detallado según el tipo de error
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error name:', error.name);
      if (error.stack) {
        console.error('Error stack:', error.stack);
      }
    }
    
    // Si es un error de OpenAI SDK, extraer información específica
    if (error && typeof error === 'object') {
      const openaiError = error as any;
      
      // Errores comunes de OpenAI
      if (openaiError.status === 401) {
        console.error('❌ Error 401: API key inválida o expirada');
        return NextResponse.json(
          { error: 'Error de autenticación con OpenAI. Verifica tu API key.' },
          { status: 500 }
        );
      }
      
      if (openaiError.status === 429) {
        console.error('❌ Error 429: Rate limit excedido o cuenta sin créditos');
        console.error('Verifica en https://platform.openai.com/usage:');
        console.error('1. Si tienes créditos disponibles');
        console.error('2. Si tu cuenta tiene límites de rate limit');
        console.error('3. Si el proyecto tiene restricciones');
        return NextResponse.json(
          { error: 'Límite de solicitudes excedido o cuenta sin créditos. Verifica tu cuenta de OpenAI en https://platform.openai.com/usage' },
          { status: 500 }
        );
      }
      
      if (openaiError.status === 404) {
        console.error('❌ Error 404: Modelo no encontrado');
        return NextResponse.json(
          { error: 'Modelo no disponible. Verifica tu cuenta de OpenAI.' },
          { status: 500 }
        );
      }
      
      // Log de otros detalles del error de OpenAI
      if ('response' in openaiError) {
        console.error('OpenAI API Error Response:', openaiError.response);
      }
      if ('status' in openaiError) {
        console.error('OpenAI API Error Status:', openaiError.status);
      }
      if ('code' in openaiError) {
        console.error('OpenAI API Error Code:', openaiError.code);
      }
    }
    
    // Error genérico si no se pudo identificar el tipo
    return NextResponse.json(
      { error: 'Error al generar respuesta del asistente' },
      { status: 500 }
    );
  }
}

// ============================================
// CÓMO PROBAR EL ENDPOINT
// ============================================
// Desde terminal (PowerShell):
// $body = @{messages=@(@{role='user';content='¿Cómo publico un producto?'})} | ConvertTo-Json
// Invoke-WebRequest -Uri http://localhost:3000/api/mercadito-assistant -Method POST -ContentType 'application/json' -Body $body
//
// Desde curl (si está disponible):
// curl -X POST http://localhost:3000/api/mercadito-assistant -H "Content-Type: application/json" -d "{\"messages\":[{\"role\":\"user\",\"content\":\"¿Cómo publico un producto?\"}]}"
//
// Respuesta esperada (éxito):
// { "answer": "Para publicar un producto en Mercadito Online PY..." }
// Status: 200
// ============================================

