/**
 * Health check endpoint
 * Monitor database and system health
 *
 * GET /api/health
 *
 * Returns:
 * - 200 OK: All systems healthy
 * - 206 Partial Content: Some systems degraded
 * - 503 Service Unavailable: Critical service down
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  checks: {
    database: {
      healthy: boolean;
      latency: number; // ms
      error?: string;
    };
    environment: {
      healthy: boolean;
      missing: string[];
    };
    memory: {
      used: number; // MB
      total: number; // MB
      percentage: number;
    };
  };
  version: string;
  environment: string;
}

const startTime = Date.now();

export async function GET() {
  const start = Date.now();
  let dbHealthy = false;
  let dbLatency = 0;
  let dbError: string | undefined;

  try {
    // Check database health with a simple query
    const dbStart = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbHealthy = true;
      dbLatency = Date.now() - dbStart;
    } catch (error) {
      dbHealthy = false;
      dbError = error instanceof Error ? error.message : 'Unknown database error';
      console.error('Database health check failed:', error);
    }

    // Check required environment variables
    const requiredEnvVars = [
      'DATABASE_URL',
      'WHOP_API_KEY',
      'WHOP_WEBHOOK_SECRET',
      'NEXT_PUBLIC_WHOP_APP_ID',
      'NEXT_PUBLIC_WHOP_COMPANY_ID',
      'NEXT_PUBLIC_APP_URL'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    const envHealthy = missingVars.length === 0;

    // Check memory usage
    const memUsage = process.memoryUsage();
    const memoryInfo = {
      used: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
      total: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
      percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)
    };

    // Determine overall health status
    const status = !dbHealthy ? 'unhealthy' :
                  !envHealthy ? 'degraded' :
                  'healthy';

    const healthStatus: HealthStatus = {
      status,
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - startTime) / 1000), // seconds
      checks: {
        database: {
          healthy: dbHealthy,
          latency: dbLatency,
          ...(dbError && { error: dbError })
        },
        environment: {
          healthy: envHealthy,
          missing: missingVars
        },
        memory: memoryInfo
      },
      version: process.env.npm_package_version || '0.1.0',
      environment: process.env.NODE_ENV || 'development',
    };

    const responseTime = Date.now() - start;

    // Return appropriate status code
    const statusCode = status === 'unhealthy' ? 503 :
                      status === 'degraded' ? 206 :
                      200;

    return NextResponse.json(
      {
        ...healthStatus,
        responseTime,
      },
      {
        status: statusCode,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'X-Response-Time': `${responseTime}ms`,
          'X-Health-Status': status
        },
      }
    );
  } catch (error) {
    console.error('Health check failed:', error);

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - start,
      },
      {
        status: 503,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'X-Health-Status': 'unhealthy'
        },
      }
    );
  } finally {
    // Always disconnect to prevent connection leaks
    try {
      await prisma.$disconnect();
    } catch (disconnectError) {
      console.error('Error disconnecting from database:', disconnectError);
    }
  }
}

// Simple HEAD request for basic monitoring
export async function HEAD() {
  let isHealthy = true;

  try {
    // Quick database check
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    isHealthy = false;
  } finally {
    try {
      await prisma.$disconnect();
    } catch {}
  }

  return new Response(null, {
    status: isHealthy ? 200 : 503,
    headers: {
      'X-Health-Status': isHealthy ? 'healthy' : 'unhealthy'
    }
  });
}
