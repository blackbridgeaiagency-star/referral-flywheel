import { NextRequest, NextResponse } from 'next/server';
import logger from '../../../../lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get parameters from Whop OAuth callback
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const companyId = searchParams.get('company_id');
    const productId = searchParams.get('product_id');
    const experienceId = searchParams.get('experience_id');

    logger.info('OAuth callback received:', {
      code: code ? 'present' : 'missing',
      state: state ? 'present' : 'missing',
      companyId,
      productId,
      experienceId
    });

    // If we have the necessary parameters, redirect to setup
    if (companyId || productId || experienceId) {
      // Build redirect URL with parameters
      const setupUrl = new URL('/setup', request.nextUrl.origin);

      if (companyId) setupUrl.searchParams.set('companyId', companyId);
      if (productId) setupUrl.searchParams.set('productId', productId);
      if (experienceId) setupUrl.searchParams.set('experienceId', experienceId);

      logger.info(`Redirecting to setup page: ${setupUrl.toString()}`);

      return NextResponse.redirect(setupUrl);
    }

    // If no parameters, just redirect to setup page
    logger.warn('No OAuth parameters received, redirecting to setup');
    return NextResponse.redirect(new URL('/setup', request.nextUrl.origin));

  } catch (error) {
    logger.error('OAuth callback error:', error);

    // On error, redirect to setup with error message
    const errorUrl = new URL('/setup', request.nextUrl.origin);
    errorUrl.searchParams.set('error', 'oauth_failed');

    return NextResponse.redirect(errorUrl);
  }
}

// Handle POST requests (alternative OAuth flow)
export async function POST(request: NextRequest) {
  return GET(request);
}