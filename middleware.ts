// middleware.ts - Simplified version that protects only admin, cron, and export routes
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import logger from './lib/logger';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Protect admin routes - these contain sensitive data
  if (pathname.startsWith('/api/admin')) {
    const adminToken = request.headers.get('x-admin-token');

    // Check for admin token
    if (!adminToken || adminToken !== process.env.ADMIN_API_KEY) {
      logger.warn('🚫 Unauthorized admin access attempt:', pathname);
      return NextResponse.json(
        { error: 'Unauthorized - Invalid admin credentials' },
        { status: 401 }
      );
    }
  }

  // Protect cron routes - prevent unauthorized triggers
  if (pathname.startsWith('/api/cron')) {
    const authHeader = request.headers.get('authorization');
    const cronSecret = request.headers.get('x-cron-secret');

    // Allow Vercel Cron (has Bearer token) or manual trigger with secret
    const isVercelCron = authHeader?.startsWith('Bearer ');
    const hasValidSecret = cronSecret === process.env.CRON_SECRET;

    if (!isVercelCron && !hasValidSecret) {
      logger.warn('🚫 Unauthorized cron access attempt:', pathname);
      return NextResponse.json(
        { error: 'Unauthorized - Invalid cron credentials' },
        { status: 401 }
      );
    }
  }

  // Protect export routes - contain sensitive data
  if (pathname.startsWith('/api/export')) {
    const exportToken = request.headers.get('x-export-token');

    if (!exportToken || exportToken !== process.env.EXPORT_API_KEY) {
      logger.warn('🚫 Unauthorized export access attempt:', pathname);
      return NextResponse.json(
        { error: 'Unauthorized - Invalid export credentials' },
        { status: 401 }
      );
    }
  }

  // For all other routes (including Whop app pages), allow through
  // Whop handles authentication in their iframe
  return NextResponse.next();
}

// Only run middleware on API routes that need protection
export const config = {
  matcher: [
    '/api/admin/:path*',
    '/api/cron/:path*',
    '/api/export/:path*',
  ]
};