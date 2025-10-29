#!/usr/bin/env tsx
import { PrismaClient } from '@prisma/client';

const directUrl = 'postgresql://postgres:cFWGc4UtNVXm6NYt@db.eerhpmjherotaqklpqnc.supabase.co:5432/postgres';
const pooledUrl = 'postgresql://postgres:cFWGc4UtNVXm6NYt@db.eerhpmjherotaqklpqnc.supabase.co:6543/postgres?pgbouncer=true';

async function testConnection(url: string, name: string) {
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  
  try {
    console.log(`\n🔍 Testing ${name}...`);
    const creators = await prisma.creator.count();
    console.log(`   ✅ Creators: ${creators}`);
    return true;
  } catch (error: any) {
    console.log(`   ❌ Error: ${error.message.split('\n')[0]}`);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  console.log('Testing both connection types:\n');
  await testConnection(directUrl, 'Direct Connection (port 5432)');
  await testConnection(pooledUrl, 'Pooled Connection (port 6543)');
}

main();
