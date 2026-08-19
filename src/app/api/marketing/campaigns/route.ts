// ============================================
// API ROUTE - MARKETING CAMPAIGNS
// GET /api/marketing/campaigns
// POST /api/marketing/campaigns
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { metaBusiness } from '@/lib/services/metaBusinessService';
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

async function userOwnsStore(
  supabase: SupabaseClient<Database>,
  userId: string,
  storeId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('stores')
    .select('id, seller_id')
    .eq('id', storeId)
    .maybeSingle();
  return Boolean(data && (data as any).seller_id === userId);
}

// GET - Listar campañas
export async function GET(request: NextRequest) {
  try {
    const auth = await requireSellerOrAdmin(request);
    if (!auth.ok) return auth.response;

    const supabase = getSupabaseServer();

    if (!supabase) {
      return NextResponse.json(
        {
          campaigns: [],
          warning: 'Supabase no está configurado (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY ausentes)',
        },
        { status: 200 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const storeId = searchParams.get('storeId');
    const campaignType = searchParams.get('type');

    if (auth.role !== 'admin') {
      if (!storeId) {
        return NextResponse.json(
          { error: 'storeId es requerido para vendedores' },
          { status: 400 }
        );
      }
      const owns = await userOwnsStore(supabase, auth.user.id, storeId);
      if (!owns) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    let query = supabase.from('marketing_campaigns').select('*');

    if (storeId) {
      query = query.eq('store_id', storeId);
    }

    if (campaignType) {
      query = query.eq('campaign_type', campaignType);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ campaigns: data || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Crear campaña
export async function POST(request: NextRequest) {
  try {
    const auth = await requireSellerOrAdmin(request);
    if (!auth.ok) return auth.response;

    const supabase = getSupabaseServer();

    if (!supabase) {
      return NextResponse.json(
        {
          error: 'Supabase no está configurado (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY ausentes)',
        },
        { status: 503 }
      );
    }

    const body = await request.json();
    const {
      storeId,
      campaignType,
      name,
      objective,
      budgetAmount,
      budgetType,
      targetUrl,
      targeting,
    } = body;

    if (!name || !objective || !targetUrl || !campaignType) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    if (campaignType === 'individual' && !storeId) {
      return NextResponse.json(
        { error: 'storeId es requerido para campañas individuales' },
        { status: 400 }
      );
    }

    if (auth.role !== 'admin' && storeId) {
      const owns = await userOwnsStore(supabase, auth.user.id, storeId);
      if (!owns) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    if (auth.role !== 'admin' && campaignType === 'platform') {
      return NextResponse.json(
        { error: 'Solo admin puede crear campañas de plataforma' },
        { status: 403 }
      );
    }

    let metaCampaignId: string | undefined;
    if (metaBusiness.isConfigured()) {
      const metaResult = await metaBusiness.createCampaign({
        name,
        objective,
        status: 'draft',
        budgetAmount,
        budgetType,
        targetUrl,
        storeId,
        campaignType,
      });

      if (metaResult.success && metaResult.campaignId) {
        metaCampaignId = metaResult.campaignId;
      }
    }

    const { data, error } = await (supabase
      .from('marketing_campaigns') as any)
      .insert({
        store_id: storeId || null,
        campaign_type: campaignType,
        meta_campaign_id: metaCampaignId,
        name,
        objective,
        budget_amount: budgetAmount,
        budget_type: budgetType,
        status: 'draft',
        target_url: targetUrl,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (targeting && data) {
      await supabase.from('campaign_targeting').insert({
        campaign_id: data.id,
        ...targeting,
      });
    }

    return NextResponse.json({ campaign: data }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
