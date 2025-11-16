// ============================================
// API ROUTE - MARKETING CAMPAIGN BY ID
// GET /api/marketing/campaigns/[id]
// PATCH /api/marketing/campaigns/[id]
// DELETE /api/marketing/campaigns/[id]
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

function getSupabaseServer(): SupabaseClient<Database> | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return null;
  }

  return createClient<Database>(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

// GET - Obtener campaña por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabaseServer();

    if (!supabase) {
      return NextResponse.json(
        {
          campaign: null,
          warning: 'Supabase no está configurado (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY ausentes)',
        },
        { status: 200 }
      );
    }

    const { id } = await params;

    const { data, error } = await supabase
      .from('marketing_campaigns')
      .select('*, campaign_targeting(*)')
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json({ campaign: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH - Actualizar campaña
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabaseServer();

    if (!supabase) {
      return NextResponse.json(
        {
          campaign: null,
          warning: 'Supabase no está configurado (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY ausentes)',
        },
        { status: 200 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    const supabase = getSupabaseServer();

    if (!supabase) {
      return NextResponse.json(
        {
          campaign: null,
          warning: 'Supabase no está configurado (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY ausentes)',
        },
        { status: 200 }
      );
    }

    const { data, error } = await (supabase
      .from('marketing_campaigns') as any)
      .update(body)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ campaign: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Eliminar campaña
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabaseServer();

    if (!supabase) {
      return NextResponse.json(
        {
          success: false,
          warning: 'Supabase no está configurado (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY ausentes)',
        },
        { status: 200 }
      );
    }

    const { id } = await params;

    const { error } = await supabase
      .from('marketing_campaigns')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

