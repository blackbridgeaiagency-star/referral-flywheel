// lib/db/prisma.ts
import { PrismaClient } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import logger from '../logger';


const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Configuration for connection pooling and retry - OPTIMIZED FOR HIGH LOAD
const prismaOptions: Prisma.PrismaClientOptions = {
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'], // Reduced logging for performance
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Error formatting
  errorFormat: process.env.NODE_ENV === 'development' ? 'pretty' : 'minimal', // Minimal in production for performance
};

// Create PrismaClient with connection retry logic
function createPrismaClient() {
  const client = new PrismaClient(prismaOptions);

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

  return client;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Helper function to test database connection
export async function testDatabaseConnection(): Promise<{ success: boolean; error?: string }> {
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
  try {
    await prisma.$disconnect();
  } catch (error) {
    logger.error('Error disconnecting from database:', error);
    // Force exit if graceful disconnect fails
    process.exit(1);
  }
}

// Handle process termination gracefully
if (process.env.NODE_ENV !== 'development') {
  process.on('beforeExit', async () => {
    await disconnectDatabase();
  });
}
