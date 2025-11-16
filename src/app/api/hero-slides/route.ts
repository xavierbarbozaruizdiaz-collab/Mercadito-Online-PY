import { NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

export async function GET() {
  try {
    const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    let supabase: SupabaseClient<Database> | null = null;
    if (supabaseUrl && supabaseAnonKey) {
      supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
    }

    if (!supabase) {
      console.warn('[hero-slides] Supabase no está configurado. Devolviendo lista vacía.');
      return new NextResponse(JSON.stringify([]), {
        status: 200,
        headers: {
          'content-type': 'application/json',
          'cache-control': 's-maxage=60, stale-while-revalidate=120',
        },
      });
    }

    const { data, error } = await supabase
      .from('hero_slides')
      .select('*')
      .eq('is_active', true)
      .order('position', { ascending: true });

    if (error) {
      console.error('Error fetching hero_slides:', error);
      // degradación elegante: devolver lista vacía pero 200
      return new NextResponse(JSON.stringify([]), {
        status: 200,
        headers: {
          'content-type': 'application/json',
          'cache-control': 's-maxage=60, stale-while-revalidate=120',
        },
      });
    }

    return new NextResponse(JSON.stringify(data || []), {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'cache-control': 's-maxage=60, stale-while-revalidate=120',
      },
    });
  } catch (err: unknown) {
    console.error('Unexpected error in /api/hero-slides:', err);
    return new NextResponse(JSON.stringify([]), {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'cache-control': 's-maxage=60, stale-while-revalidate=120',
      },
    });
  }
}



