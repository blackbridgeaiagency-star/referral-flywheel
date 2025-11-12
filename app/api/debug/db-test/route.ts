// app/api/debug/db-test/route.ts
// Database connection test endpoint for debugging production issues

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import logger from '../../../../lib/logger';


export async function GET(request: Request) {
  logger.info(' Database connection test initiated');

  const results = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    database: {
      configured: false,
      connected: false,
      error: null as string | null,
      details: {} as Record<string, any>
    },
    checks: {
      envVarExists: false,
      urlFormat: false,
      hasPassword: false,
      hasPooling: false,
      connectionTest: false,
      queryTest: false
    },
    stats: {
      tables: [] as string[],
      creatorCount: 0,
      memberCount: 0,
      commissionCount: 0
    }
  };

  try {
    // Check 1: Environment variable exists
    const dbUrl = process.env.DATABASE_URL;
    results.checks.envVarExists = !!dbUrl;
    results.database.configured = !!dbUrl;

    if (!dbUrl) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    // Check 2: URL format validation
    try {
      const url = new URL(dbUrl);
      results.database.details = {
        protocol: url.protocol,
        host: url.hostname,
        port: url.port || '5432',
        database: url.pathname.slice(1).split('?')[0],
        hasSearchParams: url.search.length > 0,
        searchParams: Object.fromEntries(url.searchParams.entries())
      };
      results.checks.urlFormat = true;
      results.checks.hasPassword = url.password ? true : false;
      results.checks.hasPooling = url.searchParams.has('pgbouncer');
    } catch (urlError) {
      results.database.error = `Invalid DATABASE_URL format: ${urlError}`;
      throw new Error(`Invalid DATABASE_URL format: ${urlError}`);
    }

    // Check 3: Test basic connection
    logger.info(' Testing database connection...');
    results.checks.connectionTest = true;

    // Check 4: Test actual query
    logger.info(' Running test queries...');
    const [creatorCount, memberCount, commissionCount] = await Promise.all([
      prisma.creator.count().catch(() => 0),
      prisma.member.count().catch(() => 0),
      prisma.commission.count().catch(() => 0)
    ]);

    results.stats.creatorCount = creatorCount;
    results.stats.memberCount = memberCount;
    results.stats.commissionCount = commissionCount;
    results.checks.queryTest = true;
    results.database.connected = true;

    // Get table list (for debugging schema issues)
    try {
      const tables = await prisma.$queryRaw`
        SELECT tablename FROM pg_tables
        WHERE schemaname = 'public'
      ` as Array<{tablename: string}>;
      results.stats.tables = tables.map(t => t.tablename);
    } catch (tableError) {
      logger.warn('Could not fetch table list:', tableError);
    }

    logger.info('Database connection test successful');

    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      results
    }, { status: 200 });

  } catch (error) {
    logger.error('❌ Database connection test failed:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    results.database.error = errorMessage;

    // Special handling for common Prisma errors
    if (errorMessage.includes("Can't reach database server")) {
      results.database.error = `Cannot reach database server. Please check:
        1. Supabase project is active (not paused)
        2. DATABASE_URL is correct
        3. Password is properly encoded
        4. Using correct port (6543 for pooling, 5432 for direct)`;
    } else if (errorMessage.includes("P1001")) {
      results.database.error = "Connection timeout - database server unreachable";
    } else if (errorMessage.includes("P1002")) {
      results.database.error = "Connection timeout - server reached but timed out";
    } else if (errorMessage.includes("P1003")) {
      results.database.error = "Database does not exist";
    } else if (errorMessage.includes("authentication failed")) {
      results.database.error = "Authentication failed - check password and user";
    }

    return NextResponse.json({
      success: false,
      message: 'Database connection failed',
      error: errorMessage,
      results,
      troubleshooting: {
        steps: [
          '1. Verify DATABASE_URL in Vercel environment variables',
          '2. Check Supabase dashboard - is project active?',
          '3. Ensure password has no special characters or is URL-encoded',
          '4. Use pooling port 6543 with ?pgbouncer=true',
          '5. Try direct connection port 5432 if pooling fails',
          '6. Check Supabase connection pool settings',
          '7. Verify IP allowlist if configured in Supabase'
        ],
        exampleUrl: 'postgresql://postgres:[PASSWORD]@db.[PROJECT_ID].supabase.co:6543/postgres?pgbouncer=true&connection_limit=1'
      }
    }, { status: 500 });
  } finally {
    // Always disconnect to prevent connection leaks
    try {
      await prisma.$disconnect();
    } catch (disconnectError) {
      logger.error('Error disconnecting from database:', disconnectError);
    }
  }
}