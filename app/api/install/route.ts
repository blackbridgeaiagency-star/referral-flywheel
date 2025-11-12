import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/db/prisma';
import logger from '../../../lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * This is the main installation endpoint for Whop apps
 * Whop will redirect here when a creator installs the app
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Get all possible parameters from Whop
    const companyId = searchParams.get('company_id') || searchParams.get('company');
    const productId = searchParams.get('product_id') || searchParams.get('product');
    const experienceId = searchParams.get('experience_id') || searchParams.get('experience');
    const userId = searchParams.get('user_id') || searchParams.get('user');
    const accessPass = searchParams.get('access_pass');
    const token = searchParams.get('token');

    logger.info('Install endpoint hit with params:', {
      companyId,
      productId,
      experienceId,
      userId,
      hasAccessPass: !!accessPass,
      hasToken: !!token
    });

    // Determine the ID to use
    const id = companyId || productId || experienceId;

    if (!id) {
      logger.error('No valid ID provided in install request');
      // Redirect to an error page
      return NextResponse.redirect(new URL('/install-error', request.nextUrl.origin));
    }

    // Check if creator already exists
    let creator = await prisma.creator.findFirst({
      where: {
        OR: [
          { companyId: id },
          { productId: id }
        ]
      }
    });

    // If creator doesn't exist, create one
    if (!creator) {
      logger.info(`Creating new creator for ${id}`);

      // For now, use the same ID for both fields if we only have one
      // The webhook will update with correct values later
      const finalCompanyId = companyId || id;
      const finalProductId = productId || id;

      creator = await prisma.creator.create({
        data: {
          companyId: finalCompanyId,
          productId: finalProductId,
          companyName: 'Your Community', // Will be updated by webhook
          welcomeMessage: 'Welcome! You now have access to exclusive content AND the opportunity to earn 10% lifetime commissions by referring friends. Check your dashboard to get your unique referral link!',
          isActive: true,
        }
      });

      logger.info('Creator created successfully:', creator.id);
    }

    // Redirect to the seller dashboard with the correct ID
    const dashboardUrl = new URL(`/seller-product/${id}`, request.nextUrl.origin);

    // Pass along any auth tokens
    if (token) dashboardUrl.searchParams.set('token', token);
    if (accessPass) dashboardUrl.searchParams.set('access_pass', accessPass);

    logger.info(`Redirecting to dashboard: ${dashboardUrl.toString()}`);

    return NextResponse.redirect(dashboardUrl);

  } catch (error) {
    logger.error('Install route error:', error);

    // Redirect to error page
    return NextResponse.redirect(new URL('/install-error', request.nextUrl.origin));
  }
}

// Also handle POST requests
export async function POST(request: NextRequest) {
  return GET(request);
}