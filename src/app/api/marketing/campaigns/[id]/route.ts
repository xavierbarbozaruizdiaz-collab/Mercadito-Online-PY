// ============================================
// API ROUTE - MARKETING CAMPAIGN BY ID
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { requireSellerOrAdmin } from '@/lib/auth/apiAuth';

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

async function canAccessCampaign(
  supabase: SupabaseClient<Database>,
  userId: string,
  role: string,
  campaignId: string
): Promise<boolean> {
  if (role === 'admin') return true;

  const { data: campaign } = await supabase
    .from('marketing_campaigns')
    .select('id, store_id')
    .eq('id', campaignId)
    .maybeSingle();

  const storeId = (campaign as { store_id?: string | null } | null)?.store_id;
  if (!storeId) return false;

  const { data: store } = await supabase
    .from('stores')
    .select('seller_id')
    .eq('id', storeId)
    .maybeSingle();

  return Boolean(store && (store as { seller_id?: string }).seller_id === userId);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireSellerOrAdmin(request);
    if (!auth.ok) return auth.response;

    const supabase = getSupabaseServer();
    if (!supabase) {
      return NextResponse.json(
        { campaign: null, warning: 'Supabase no está configurado' },
        { status: 503 }
      );
    }

    const { id } = await params;
    const allowed = await canAccessCampaign(supabase, auth.user.id, auth.role, id);
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireSellerOrAdmin(request);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const body = await request.json();
    const supabase = getSupabaseServer();

    if (!supabase) {
      return NextResponse.json({ error: 'Supabase no está configurado' }, { status: 503 });
    }

    const allowed = await canAccessCampaign(supabase, auth.user.id, auth.role, id);
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireSellerOrAdmin(request);
    if (!auth.ok) return auth.response;

    const supabase = getSupabaseServer();
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase no está configurado' }, { status: 503 });
    }

    const { id } = await params;
    const allowed = await canAccessCampaign(supabase, auth.user.id, auth.role, id);
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

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
