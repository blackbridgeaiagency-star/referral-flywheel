// lib/db/prisma-serverless.ts
// Optimized Prisma client for Vercel Serverless with connection pooling fixes

import { PrismaClient } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import logger from '../logger';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Serverless-optimized configuration
const prismaOptions: Prisma.PrismaClientOptions = {
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  errorFormat: process.env.NODE_ENV === 'development' ? 'pretty' : 'minimal',
};

// Create PrismaClient with serverless optimizations
function createPrismaClient() {
  const client = new PrismaClient(prismaOptions);

  // Middleware for automatic connection management
  client.$use(async (params, next) => {
    const maxRetries = 3;
    const retryDelay = (attempt: number) => Math.min(1000 * Math.pow(2, attempt), 5000);

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Execute the query
        const result = await next(params);

        // In production, disconnect after each query to prevent connection leaks
        if (process.env.NODE_ENV === 'production' && !globalForPrisma.prisma) {
          // Don't disconnect the global instance
          setTimeout(() => {
            client.$disconnect().catch(err => {
              logger.warn('Failed to disconnect Prisma client:', err);
            });
          }, 0);
        }

        return result;
      } catch (error: any) {
        // Connection error codes
        const isConnectionError =
          error.code === 'P1001' || // Can't reach database
          error.code === 'P1002' || // Connection timeout
          error.code === 'P1008' || // Operations timed out
          error.code === 'P1017' || // Server has closed the connection
          error.message?.includes("Can't reach database server") ||
          error.message?.includes("Connection timeout") ||
          error.message?.includes("Connection pool timeout") ||
          error.message?.includes("Connection terminated");

        if (isConnectionError && attempt < maxRetries - 1) {
          const delay = retryDelay(attempt);
          logger.warn(`Database connection failed (attempt ${attempt + 1}/${maxRetries}). Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));

          // Try to reconnect
          try {
            await client.$connect();
          } catch (connectError) {
            logger.warn('Failed to reconnect:', connectError);
          }

          continue;
        }

        // If not a connection error or max retries reached, throw the error
        logger.error(`Database query failed after ${attempt + 1} attempts:`, error);
        throw error;
      }
    }
  });

  return client;
}

// Use global instance in development, create new in production
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Connection health check with timeout
export async function testDatabaseConnection(): Promise<{ success: boolean; error?: string; latency?: number }> {
  const startTime = Date.now();

  try {
    // Set a timeout for the health check
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Health check timeout')), 5000)
    );

    const queryPromise = prisma.$queryRaw`SELECT 1`;

    await Promise.race([queryPromise, timeoutPromise]);

    const latency = Date.now() - startTime;
    return { success: true, latency };
  } catch (error) {
    logger.error('Database connection test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      latency: Date.now() - startTime
    };
  }
}

// Aggressive cleanup for serverless
export async function disconnectDatabase() {
  try {
    await Promise.race([
      prisma.$disconnect(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Disconnect timeout')), 3000)
      )
    ]);
  } catch (error) {
    logger.error('Error disconnecting from database:', error);
    // Don't throw, just log - let the process end
  }
}

// Export connection info for debugging
export function getConnectionInfo() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return { error: 'DATABASE_URL not set' };

  const url = new URL(dbUrl.replace('postgresql://', 'http://'));
  const params = Object.fromEntries(url.searchParams);

  return {
    host: url.hostname,
    port: url.port,
    database: url.pathname.slice(1),
    pooling: params.pgbouncer === 'true',
    connectionLimit: params.connection_limit || 'not set',
    poolTimeout: params.pool_timeout || 'default',
    connectTimeout: params.connect_timeout || 'default',
  };
}