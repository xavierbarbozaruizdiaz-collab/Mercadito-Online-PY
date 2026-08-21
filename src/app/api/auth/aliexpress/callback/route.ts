import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';
import {
  exchangeAliExpressAuthCode,
  getAliExpressAuthorizeUrl,
  isAliExpressConfigured,
} from '@/lib/services/aliexpressClient';
import { saveAliExpressOAuthTokens } from '@/lib/services/sourcedCatalogService';

function esc(value: string) {
  return value.replace(/[&<>"']/g, (ch) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] || ch)
  );
}

function html(body: string, status = 200) {
  return new NextResponse(
    `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AliExpress</title>
<style>body{font-family:system-ui,sans-serif;max-width:640px;margin:48px auto;padding:0 16px;color:#111;line-height:1.5}a.btn{display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:600}code,textarea{font-size:13px;width:100%;box-sizing:border-box}textarea{min-height:90px}</style></head><body>${body}</body></html>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const error = request.nextUrl.searchParams.get('error');

  if (error) {
    return html(`<h1>Autorización cancelada</h1><p>${esc(error)}</p>`, 400);
  }

  if (!code) {
    if (!isAliExpressConfigured()) {
      return html('<h1>AliExpress no configurado</h1><p>Faltan APP_KEY y APP_SECRET en Vercel.</p>', 503);
    }
    const url = getAliExpressAuthorizeUrl();
    return html(`
      <h1>Autorizar AliExpress</h1>
      <p>Entrá con la cuenta de dropshipping y <strong>aceptá los permisos de la app</strong>. Iniciar sesión no alcanza: AliExpress tiene que devolverte acá con un código.</p>
      <p>Si después del login te deja en ds.aliexpress.com, volvé y pulsá el botón de nuevo. El éxito es la pantalla <strong>AliExpress autorizado</strong>.</p>
      <p><a class="btn" href="${url}">Autorizar con AliExpress</a></p>
    `);
  }

  try {
    const tokens = await exchangeAliExpressAuthCode(code);
    await saveAliExpressOAuthTokens(tokens);
    return html(`
      <h1>AliExpress autorizado</h1>
      <p>El token quedó guardado. Volvé a Catálogo Ubuy e importá las categorías. No hace falta redeploy.</p>
      <p><a href="/dashboard/sourced-catalog">Ir al catálogo internacional</a></p>
    `);
  } catch (err: any) {
    logger.error('[aliexpress/callback]', err);
    return html(`<h1>No se pudo obtener el token</h1><p>${esc(err?.message || 'Error')}</p>`, 500);
  }
}
