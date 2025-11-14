// lib/db/prisma.ts
import { PrismaClient } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import logger from '../logger';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Check if we're in Vercel build environment
// During build: No DATABASE_URL or building on Vercel
export const isVercelBuild =
  (process.env.VERCEL === '1' && process.env.CI === '1') ||
  process.env.NEXT_PHASE === 'phase-production-build' ||
  (!process.env.DATABASE_URL && process.env.NODE_ENV === 'production');

// Configuration for connection pooling and retry - OPTIMIZED FOR VERCEL SERVERLESS
const prismaOptions: Prisma.PrismaClientOptions = {
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'], // Reduced logging for performance
  datasources: {
    db: {
      // Use dummy URL during build to prevent connection attempts
      url: isVercelBuild
        ? 'postgresql://user:password@localhost:5432/db'
        : (process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/db'),
    },
  },
  // Error formatting
  errorFormat: process.env.NODE_ENV === 'development' ? 'pretty' : 'minimal', // Minimal in production for performance
};

// Create PrismaClient with connection retry logic
function createPrismaClient() {
  const client = new PrismaClient(prismaOptions);

  // Skip middleware during build to prevent connection attempts
  if (!isVercelBuild && process.env.DATABASE_URL) {
    // Add middleware for retry logic on connection failures
    client.$use(async (params, next) => {
      const maxRetries = 3;
      const retryDelay = (attempt: number) => Math.min(1000 * Math.pow(2, attempt), 5000);

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          return await next(params);
        } catch (error: any) {
          // Check if it's a connection error
          const isConnectionError =
            error.code === 'P1001' || // Can't reach database
            error.code === 'P1002' || // Connection timeout
            error.message?.includes("Can't reach database server") ||
            error.message?.includes("Connection timeout");

          if (isConnectionError && attempt < maxRetries - 1) {
            const delay = retryDelay(attempt);
            logger.warn(`Database connection failed (attempt ${attempt + 1}/${maxRetries}). Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }

          // If not a connection error or max retries reached, throw the error
          throw error;
        }
      }
    });
  }

  return client;
}

// During build, export a proxy that prevents any database operations
export const prisma = isVercelBuild
  ? new Proxy({} as PrismaClient, {
      get(target, prop) {
        if (prop === '$queryRaw' || prop === '$executeRaw' || prop === '$transaction') {
          return async () => {
            console.log(`[BUILD] Skipping database operation: ${String(prop)}`);
            return [];
          };
        }
        // Return a proxy for any model access (like prisma.user)
        return new Proxy({}, {
          get() {
            return async () => {
              console.log(`[BUILD] Skipping database query during build`);
              return null;
            };
          }
        });
      }
    })
  : (globalForPrisma.prisma ?? createPrismaClient());

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Helper function to test database connection
export async function testDatabaseConnection(): Promise<{ success: boolean; error?: string }> {
  // Skip during build
  if (isVercelBuild) {
    return { success: true, error: 'Skipped during build' };
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    return { success: true };
  } catch (error) {
    logger.error('Database connection test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Graceful shutdown helper
export async function disconnectDatabase() {
  // Skip during build
  if (isVercelBuild) {
    return;
  }

  try {
    await prisma.$disconnect();
  } catch (error) {
    logger.error('Error disconnecting from database:', error);
    // Force exit if graceful disconnect fails
    process.exit(1);
  }
}

// Handle process termination gracefully
// Skip during build to prevent connection attempts
if (process.env.NODE_ENV !== 'development' && !isVercelBuild) {
  process.on('beforeExit', async () => {
    await disconnectDatabase();
  });
}
