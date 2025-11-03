import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseServer';

export async function GET() {
  try {
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



