// ============================================
// MERCADITO ONLINE PY - HEALTH CHECK ENDPOINT
// Verificación de salud de servicios críticos
// ============================================

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseServer';

interface HealthCheck {
  status: 'ok' | 'error';
  message?: string;
  latency?: number;
}

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: {
    database: HealthCheck;
    storage: HealthCheck;
    api: HealthCheck;
  };
  version?: string;
}

export async function GET(): Promise<NextResponse<HealthResponse>> {
  const checks: HealthResponse['checks'] = {
    database: { status: 'error' },
    storage: { status: 'error' },
    api: { status: 'ok', latency: 0 },
  };

  const startTime = Date.now();

  // Check Database - Query hero_slides para verificar conectividad
  try {
    const dbStart = Date.now();
    const { data, error } = await supabase
      .from('hero_slides')
      .select('id,is_active,sort_order,created_at')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })
      .limit(10);
    
    checks.database = {
      status: error ? 'error' : 'ok',
      message: error ? error.message : undefined,
      latency: Date.now() - dbStart,
    };
  } catch (error: any) {
    checks.database = {
      status: 'error',
      message: error?.message || 'Database check failed',
    };
  }

  // Check Storage
  try {
    const storageStart = Date.now();
    const { error } = await supabase.storage
      .from('product-images')
      .list('', { limit: 1 });
    
    checks.storage = {
      status: error ? 'error' : 'ok',
      message: error ? error.message : undefined,
      latency: Date.now() - storageStart,
    };
  } catch (error: any) {
    checks.storage = {
      status: 'error',
      message: error?.message || 'Storage check failed',
    };
  }

  // Calculate API latency
  checks.api.latency = Date.now() - startTime;

  // Determine overall status
  const allChecks = Object.values(checks);
  const criticalChecks = [checks.database, checks.storage];
  
  let overallStatus: HealthResponse['status'] = 'healthy';
  
  if (criticalChecks.some(check => check.status === 'error')) {
    overallStatus = 'unhealthy';
  } else if (allChecks.some(check => check.status === 'error')) {
    overallStatus = 'degraded';
  }

  // Agregar información de debug de variables de entorno
  const response: HealthResponse & {
    env?: {
      SUPABASE_URL: boolean;
      SUPABASE_ANON_KEY: boolean;
      NEXT_PUBLIC_SUPABASE_URL: boolean;
      NEXT_PUBLIC_SUPABASE_ANON_KEY: boolean;
    };
    heroSlides?: {
      count?: number;
      error?: string;
    };
  } = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    checks,
    version: process.env.npm_package_version || 'unknown',
    env: {
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: !!process.env.SUPABASE_ANON_KEY,
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    },
  };

  // Agregar información específica de hero_slides si la query fue exitosa
  if (checks.database.status === 'ok') {
    try {
      const { data, error } = await supabase
        .from('hero_slides')
        .select('id,is_active,sort_order,created_at')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false })
        .limit(10);
      
      response.heroSlides = {
        count: data?.length ?? 0,
        error: error?.message ?? undefined,
      };
    } catch (err: any) {
      response.heroSlides = {
        error: err?.message || 'Failed to fetch hero slides',
      };
    }
  }

  // Return 200 for healthy/degraded, 503 for unhealthy
  const statusCode = overallStatus === 'unhealthy' ? 503 : 200;

  return NextResponse.json(response, { status: statusCode });
}

