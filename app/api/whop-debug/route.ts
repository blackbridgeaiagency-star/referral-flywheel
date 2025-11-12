import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Debug endpoint to log what Whop is sending
 */
export async function GET(request: NextRequest) {
  const headers = Object.fromEntries(request.headers.entries());
  const cookies = Object.fromEntries(request.cookies.getAll().map(c => [c.name, c.value]));
  const searchParams = Object.fromEntries(request.nextUrl.searchParams.entries());

  console.log('=== WHOP DEBUG ===');
  console.log('URL:', request.url);
  console.log('Method:', request.method);
  console.log('Headers:', JSON.stringify(headers, null, 2));
  console.log('Cookies:', JSON.stringify(cookies, null, 2));
  console.log('Query Params:', JSON.stringify(searchParams, null, 2));
  console.log('==================');

  // Return debug info
  return NextResponse.json({
    message: 'Debug endpoint - check logs',
    url: request.url,
    headers: headers,
    cookies: cookies,
    params: searchParams,
    timestamp: new Date().toISOString()
  });
}

export async function POST(request: NextRequest) {
  return GET(request);
}