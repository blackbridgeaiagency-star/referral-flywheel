// app/api/debug/connection-test/route.ts
// Diagnostic endpoint to test database connection pool behavior

import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db/prisma';
import { getConnectionInfo } from '../../../../lib/db/prisma-serverless';

export async function GET() {
  const results: any = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    connectionInfo: getConnectionInfo(),
    tests: {},
    recommendations: []
  };

  // Test 1: Single connection
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    results.tests.singleQuery = {
      success: true,
      latency: Date.now() - start
    };
  } catch (error: any) {
    results.tests.singleQuery = {
      success: false,
      error: error.message
    };
  }

  // Test 2: Concurrent connections (simulate multiple users)
  try {
    const start = Date.now();
    const promises = Array(5).fill(null).map(async (_, i) => {
      const queryStart = Date.now();
      // Use a simpler query that returns data
      await prisma.$queryRaw`SELECT ${i}::int as num, NOW() as timestamp`;
      return Date.now() - queryStart;
    });

    const latencies = await Promise.all(promises);
    results.tests.concurrentQueries = {
      success: true,
      totalLatency: Date.now() - start,
      individualLatencies: latencies,
      averageLatency: latencies.reduce((a, b) => a + b, 0) / latencies.length
    };
  } catch (error: any) {
    results.tests.concurrentQueries = {
      success: false,
      error: error.message
    };
  }

  // Test 3: Rapid sequential connections (test connection reuse)
  try {
    const start = Date.now();
    const latencies = [];
    for (let i = 0; i < 10; i++) {
      const queryStart = Date.now();
      await prisma.$queryRaw`SELECT ${i}::int as num`;
      latencies.push(Date.now() - queryStart);
    }

    results.tests.sequentialQueries = {
      success: true,
      totalLatency: Date.now() - start,
      individualLatencies: latencies,
      averageLatency: latencies.reduce((a, b) => a + b, 0) / latencies.length
    };
  } catch (error: any) {
    results.tests.sequentialQueries = {
      success: false,
      error: error.message
    };
  }

  // Analyze connection string
  const dbUrl = process.env.DATABASE_URL || '';
  const connectionLimit = dbUrl.match(/connection_limit=(\d+)/)?.[1];
  const hasPoolTimeout = dbUrl.includes('pool_timeout');
  const hasPgBouncer = dbUrl.includes('pgbouncer=true');
  const port = dbUrl.match(/:(\d+)\//)?.[1];

  results.configuration = {
    connectionLimit: connectionLimit || 'not set',
    hasPoolTimeout,
    hasPgBouncer,
    port,
    isPooledPort: port === '6543'
  };

  // Generate recommendations
  if (!connectionLimit || parseInt(connectionLimit) < 10) {
    results.recommendations.push({
      severity: 'HIGH',
      issue: 'Connection limit too low',
      current: connectionLimit || '1 (default)',
      recommended: '10-20 for Vercel',
      fix: 'Add ?connection_limit=10 to DATABASE_URL'
    });
  }

  if (!hasPoolTimeout) {
    results.recommendations.push({
      severity: 'MEDIUM',
      issue: 'No pool timeout configured',
      recommended: 'pool_timeout=0',
      fix: 'Add &pool_timeout=0 to DATABASE_URL'
    });
  }

  if (port === '5432') {
    results.recommendations.push({
      severity: 'HIGH',
      issue: 'Using direct connection port instead of pooler',
      current: 'Port 5432 (direct)',
      recommended: 'Port 6543 (pgbouncer)',
      fix: 'Change port from 5432 to 6543 in DATABASE_URL'
    });
  }

  if (!hasPgBouncer) {
    results.recommendations.push({
      severity: 'HIGH',
      issue: 'PgBouncer not enabled',
      recommended: 'pgbouncer=true',
      fix: 'Add ?pgbouncer=true to DATABASE_URL'
    });
  }

  // Test for common timeout errors
  if (results.tests.concurrentQueries?.error?.includes('timeout') ||
      results.tests.concurrentQueries?.error?.includes('Connection pool')) {
    results.recommendations.push({
      severity: 'CRITICAL',
      issue: 'Connection pool exhaustion detected',
      solution: 'Increase connection_limit to at least 20',
      fix: 'Update DATABASE_URL with ?pgbouncer=true&connection_limit=20&pool_timeout=0'
    });
  }

  // Calculate health score
  const passedTests = Object.values(results.tests).filter((test: any) => test.success).length;
  const totalTests = Object.keys(results.tests).length;
  results.healthScore = `${passedTests}/${totalTests} tests passed`;

  return NextResponse.json(results, {
    status: passedTests === totalTests ? 200 : 500
  });
}