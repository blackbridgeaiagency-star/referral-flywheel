// app/api/debug/whop-params/route.ts
// Debug endpoint to see what parameters Whop is sending

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const headers = Object.fromEntries(request.headers.entries());

  // Get all query parameters
  const params: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    params[key] = value;
  });

  const debugInfo = {
    timestamp: new Date().toISOString(),
    url: request.url,
    pathname: request.nextUrl.pathname,
    searchParams: params,
    headers: {
      referer: headers['referer'],
      host: headers['host'],
      'user-agent': headers['user-agent'],
      origin: headers['origin'],
      'sec-fetch-site': headers['sec-fetch-site'],
      'sec-fetch-mode': headers['sec-fetch-mode'],
      'sec-fetch-dest': headers['sec-fetch-dest'],
    },
    isInIframe: headers['sec-fetch-dest'] === 'iframe',
    referrerInfo: headers['referer'] ? {
      isWhop: headers['referer'].includes('whop.com'),
      referrer: headers['referer']
    } : null
  };

  return NextResponse.json({
    success: true,
    message: 'Debug information for Whop integration',
    debugInfo,
    instructions: {
      howToUse: [
        '1. Access this URL from within Whop app',
        '2. Check the "searchParams" to see what Whop is sending',
        '3. Check "isInIframe" to verify iframe context',
        '4. Check "referrerInfo" to see if request came from Whop'
      ],
      expectedParams: {
        experienceId: 'The product or membership ID from Whop'
      }
    }
  }, {
    headers: {
      'Cache-Control': 'no-store, max-age=0'
    }
  });
}
