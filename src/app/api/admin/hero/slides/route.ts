import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { createServerClient } from '@/lib/supabase/server';

// [SECURITY PATCH FASE2] Verificación de rol admin para gestionar hero slides
async function verifyAdminAccess() {
  const supabase = await createServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.user) {
    return { authorized: false, error: 'No autenticado', status: 401 };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();

  if (profileError || !profile) {
    return { authorized: false, error: 'Error verificando permisos', status: 500 };
  }

  if ((profile as any).role !== 'admin') {
    return { authorized: false, error: 'No autorizado. Se requiere rol de administrador.', status: 403 };
  }

  return { authorized: true };
}

export async function POST(req: NextRequest) {
  // [SECURITY PATCH FASE2] Verificación de rol admin para gestionar hero slides
  const authCheck = await verifyAdminAccess();
  if (!authCheck.authorized) {
    return NextResponse.json({ ok: false, error: authCheck.error }, { status: authCheck.status });
  }

  const body = await req.json();
  if (body.bg_type === 'image' && !body.storage_path) {
    return NextResponse.json({ ok: false, error: 'storage_path required for image' }, { status: 400 });
  }
  const { error } = await (supabaseAdmin as any).from('hero_slides').insert(body);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function PUT(req: NextRequest) {
  // [SECURITY PATCH FASE2] Verificación de rol admin para gestionar hero slides
  const authCheck = await verifyAdminAccess();
  if (!authCheck.authorized) {
    return NextResponse.json({ ok: false, error: authCheck.error }, { status: authCheck.status });
  }

  const body = await req.json();
  const { id, ...rest } = body || {};
  if (!id) return NextResponse.json({ ok: false, error: 'id required' }, { status: 400 });
  if (rest.bg_type === 'image' && !rest.storage_path) {
    return NextResponse.json({ ok: false, error: 'storage_path required for image' }, { status: 400 });
  }
  const { error } = await (supabaseAdmin as any).from('hero_slides').update(rest).eq('id', id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  // [SECURITY PATCH FASE2] Verificación de rol admin para gestionar hero slides
  const authCheck = await verifyAdminAccess();
  if (!authCheck.authorized) {
    return NextResponse.json({ ok: false, error: authCheck.error }, { status: authCheck.status });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ ok: false, error: 'id required' }, { status: 400 });
  const { error } = await (supabaseAdmin as any).from('hero_slides').delete().eq('id', id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}


