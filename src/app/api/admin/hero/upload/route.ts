import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: 'file is required' }, { status: 400 });
    }

    const ext = (file.type?.split('/')?.[1] || 'webp').toLowerCase();
    const key = `hero/${randomUUID()}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const { error } = await supabaseAdmin.storage
      .from('hero-banners')
      .upload(key, new Uint8Array(arrayBuffer), { contentType: file.type || 'image/webp', upsert: true });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, storagePath: key });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'unknown';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}






