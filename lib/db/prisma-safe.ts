// lib/db/prisma-safe.ts
// Build-safe Prisma client that prevents connection attempts during build

import { PrismaClient } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import logger from '../logger';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Check if we're in build environment
const isBuildTime = process.env.VERCEL_ENV === 'production' && !process.env.DATABASE_URL;
const isVercelBuild = process.env.VERCEL === '1' && process.env.CI === '1';

// Configuration for connection pooling
const prismaOptions: Prisma.PrismaClientOptions = {
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://placeholder',
    },
  },
  errorFormat: process.env.NODE_ENV === 'development' ? 'pretty' : 'minimal',
};

// Create PrismaClient that's safe during build
function createPrismaClient() {
  // During build, return a dummy client that won't connect
  if (isBuildTime || isVercelBuild) {
    logger.info('Build environment detected - using placeholder Prisma client');
    return new PrismaClient({
      ...prismaOptions,
      datasources: {
        db: {
          url: 'postgresql://user:password@localhost:5432/db', // Dummy URL
        },
      },
    });
  }

  const client = new PrismaClient(prismaOptions);

  // Only add middleware in runtime environment
  if (process.env.DATABASE_URL) {
    client.$use(async (params, next) => {
      const maxRetries = 3;
      const retryDelay = (attempt: number) => Math.min(1000 * Math.pow(2, attempt), 5000);

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          return await next(params);
        } catch (error: any) {
          const isConnectionError =
            error.code === 'P1001' ||
            error.code === 'P1002' ||
            error.message?.includes("Can't reach database server") ||
            error.message?.includes("Connection timeout");

          if (isConnectionError && attempt < maxRetries - 1) {
            const delay = retryDelay(attempt);
            logger.warn(`Database connection failed (attempt ${attempt + 1}/${maxRetries}). Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }

          throw error;
        }
      }
    });
  }

  return client;
}

// Export safe prisma instance
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Safe database connection test
export async function testDatabaseConnection(): Promise<{ success: boolean; error?: string }> {
  // Skip during build
  if (isBuildTime || isVercelBuild) {
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

// Safe disconnect
export async function disconnectDatabase() {
  // Skip during build
  if (isBuildTime || isVercelBuild) {
    return;
  }

  try {
    await prisma.$disconnect();
  } catch (error) {
    logger.error('Error disconnecting from database:', error);
  }
}