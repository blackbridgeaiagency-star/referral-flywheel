// middleware.ts - Protects admin and cron routes
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Protect admin routes
  if (pathname.startsWith('/api/admin')) {
    const adminToken = request.headers.get('x-admin-token');

    // Check for admin token
    if (!adminToken || adminToken !== process.env.ADMIN_API_KEY) {
      console.log('⚠️ Unauthorized admin access attempt:', pathname);
      return NextResponse.json(
        { error: 'Unauthorized - Invalid admin credentials' },
        { status: 401 }
      );
    }
  }

  // Protect cron routes (called by Vercel Cron)
  if (pathname.startsWith('/api/cron')) {
    const authHeader = request.headers.get('authorization');
    const cronSecret = request.headers.get('x-cron-secret');

    // Allow Vercel Cron (has Bearer token) or manual trigger with secret
    const isVercelCron = authHeader?.startsWith('Bearer ');
    const hasValidSecret = cronSecret === process.env.CRON_SECRET;

    if (!isVercelCron && !hasValidSecret) {
      console.log('⚠️ Unauthorized cron access attempt:', pathname);
      return NextResponse.json(
        { error: 'Unauthorized - Invalid cron credentials' },
        { status: 401 }
      );
    }
  }

  // Protect export routes (sensitive data)
  if (pathname.startsWith('/api/export')) {
    const exportToken = request.headers.get('x-export-token');

    if (!exportToken || exportToken !== process.env.EXPORT_API_KEY) {
      console.log('⚠️ Unauthorized export access attempt:', pathname);
      return NextResponse.json(
        { error: 'Unauthorized - Invalid export credentials' },
        { status: 401 }
      );
    }
  }

  return NextResponse.next();
}

// Configure which routes to protect
export const config = {
  matcher: [
    '/api/admin/:path*',
    '/api/cron/:path*',
    '/api/export/:path*'
  ]
};