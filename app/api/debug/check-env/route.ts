// app/api/debug/check-env/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  const databaseUrl = process.env.DATABASE_URL;

  return NextResponse.json({
    hasDatabaseUrl: !!databaseUrl,
    databaseUrlFormat: databaseUrl ? {
      startsWithPostgresql: databaseUrl.startsWith('postgresql://'),
      hasPort6543: databaseUrl.includes(':6543'),
      hasPgBouncer: databaseUrl.includes('pgbouncer=true'),
      hasConnectionLimit: databaseUrl.includes('connection_limit'),
      length: databaseUrl.length,
      host: databaseUrl.split('@')[1]?.split(':')[0] || 'unknown'
    } : null,
    whopApiKey: !!process.env.WHOP_API_KEY,
    whopWebhookSecret: !!process.env.WHOP_WEBHOOK_SECRET,
    appUrl: process.env.NEXT_PUBLIC_APP_URL
  });
}
