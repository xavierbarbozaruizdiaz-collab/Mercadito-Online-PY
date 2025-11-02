// ============================================
// MERCADITO ONLINE PY - HEALTH CHECK ENDPOINT
// Verificación de salud de servicios críticos
// ============================================

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

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

  // Check Database
  try {
    const dbStart = Date.now();
    const { error } = await supabase
      .from('products')
      .select('id')
      .limit(1);
    
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

  const response: HealthResponse = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    checks,
    version: process.env.npm_package_version || 'unknown',
  };

  // Return 200 for healthy/degraded, 503 for unhealthy
  const statusCode = overallStatus === 'unhealthy' ? 503 : 200;

  return NextResponse.json(response, { status: statusCode });
}

