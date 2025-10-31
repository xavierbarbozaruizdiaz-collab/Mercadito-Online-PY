import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (body.bg_type === 'image' && !body.storage_path) {
    return NextResponse.json({ ok: false, error: 'storage_path required for image' }, { status: 400 });
  }
  const { error } = await (supabaseAdmin as any).from('hero_slides').insert(body);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function PUT(req: NextRequest) {
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
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ ok: false, error: 'id required' }, { status: 400 });
  const { error } = await (supabaseAdmin as any).from('hero_slides').delete().eq('id', id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}


