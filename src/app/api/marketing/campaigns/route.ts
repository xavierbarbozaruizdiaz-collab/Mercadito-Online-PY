// ============================================
// API ROUTE - MARKETING CAMPAIGNS
// GET /api/marketing/campaigns
// POST /api/marketing/campaigns
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { metaBusiness } from '@/lib/services/metaBusinessService';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Listar campañas
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const storeId = searchParams.get('storeId');
    const campaignType = searchParams.get('type');

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

    // Validaciones
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

    // Crear campaña en Meta (si está configurado)
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

    // Crear en base de datos
    const { data, error } = await supabase
      .from('marketing_campaigns')
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

    // Crear targeting si se proporciona
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

