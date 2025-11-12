#!/usr/bin/env tsx
import { PrismaClient } from '@prisma/client';
import logger from '../lib/logger';


// Use environment variable for database connections
// Fallback to placeholders if not set (will fail but won't expose secrets)
const baseUrl = process.env.DATABASE_URL ||
                'postgresql://postgres:[REPLACE_WITH_PASSWORD]@db.eerhpmjherotaqklpqnc.supabase.co:6543/postgres?pgbouncer=true';
const directUrl = baseUrl.replace('6543', '5432').replace('?pgbouncer=true', '');
const pooledUrl = baseUrl.includes('pgbouncer') ? baseUrl : baseUrl + '?pgbouncer=true';

async function testConnection(url: string, name: string) {
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  
  try {
    logger.debug(`\n🔍 Testing ${name}...`);
    const creators = await prisma.creator.count();
    logger.debug(`   ✅ Creators: ${creators}`);
    return true;
  } catch (error: any) {
    logger.debug(`   ❌ Error: ${error.message.split('\n')[0]}`);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  logger.debug('Testing both connection types:\n');
  await testConnection(directUrl, 'Direct Connection (port 5432)');
  await testConnection(pooledUrl, 'Pooled Connection (port 6543)');
}

main();
