import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { productId } = await req.json();

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { apikey: serviceKey } }
    });

    const insert = await admin
      .from('product_images')
      .insert({
        product_id: productId,
        url: 'debug://test-image',
        thumbnail_url: 'debug://test-thumb',
        alt_text: 'debug',
        sort_order: 0,
        is_cover: false
      })
      .select('*')
      .single();

    return NextResponse.json({
      success: true,
      insert,
    }, { status: 200 });

  } catch (e: unknown) {
    const error = e instanceof Error ? e : new Error(String(e));
    return NextResponse.json({
      success: false,
      error: {
        message: error.message,
        stack: error.stack ?? null,
      }
    }, { status: 500 });
  }
}

