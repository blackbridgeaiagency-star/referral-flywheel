import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/db/prisma';
import { generateFingerprint } from '../../../lib/utils/fingerprint';
import { hashIP, extractRealIP } from '../../../lib/utils/ip-hash';
import { applyRateLimit } from '../../../lib/security/rate-limit-utils';
import logger from '../../../lib/logger';


export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Referral Link Redirect Route (P1: Rate Limited)
 *
 * Handles referral link clicks: /r/FIRSTNAME-ABC123
 * - Rate limiting: 30 requests per minute per IP (prevents click farming)
 * - Creates attribution click record
 * - Sets 30-day cookie
 * - Redirects to product page or discover
 */

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // P1 FIX: RATE LIMITING (Prevent click farming & DoS)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const realIP = extractRealIP(request) || 'unknown';
    const rateLimitResult = await applyRateLimit(
      `referral-redirect:${realIP}`,
      30,  // 30 clicks per minute max
      60000 // 1 minute window
    );

    if (!rateLimitResult.success) {
      logger.warn(` Rate limit exceeded for IP: ${realIP}`);
      const retryAfterSeconds = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        {
          error: 'Too many requests',
          message: 'You are clicking referral links too quickly. Please wait a moment.',
          retryAfter: retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfterSeconds.toString(),
          }
        }
      );
    }

    const { code } = params;

    // Validate referral code format
    if (!code || code.length < 5) {
      logger.error('❌ Invalid referral code format:', code);
      return redirectWithError('invalid_code');
    }

    logger.info(' Referral click:', code);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 1. FIND MEMBER BY REFERRAL CODE
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const member = await prisma.member.findUnique({
      where: { referralCode: code },
      include: { creator: true }
    });

    if (!member) {
      logger.error('❌ Member not found for code:', code);
      return redirectWithError('invalid_code');
    }

    if (!member.creator) {
      logger.error('❌ Creator not found for member:', member.id);
      return redirectWithError('invalid_code');
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 2. GENERATE FINGERPRINT & CHECK FOR DUPLICATE CLICKS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const fingerprint: string = generateFingerprint(request);

    // Check if this fingerprint already has an active click
    const existingClick = await prisma.attributionClick.findFirst({
      where: {
        memberId: member.id,
        fingerprint,
        expiresAt: { gte: new Date() },
      }
    });

    if (existingClick) {
      logger.debug('⏭️  Duplicate click detected, using existing attribution');
      // Still redirect - don't create duplicate
      return redirectToProduct(member.creator.productId, code);
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 3. CREATE ATTRIBUTION CLICK (30-day window)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    try {
      // Extract and hash IP for privacy
      const realIP = extractRealIP(request);
      const ipHash = hashIP(realIP);

      await prisma.attributionClick.create({
        data: {
          referralCode: code,  // ✅ Fixed: Added missing referralCode
          memberId: member.id,
          fingerprint,
          ipHash,  // ✅ Fixed: Using hashed IP instead of plain IP
          userAgent: request.headers.get('user-agent') || '',
          expiresAt,
        }
      });

      logger.info(`Attribution created for ${code} (expires in 30 days)`);
    } catch (dbError) {
      // Log error but continue with redirect (don't block user)
      logger.error('❌ Failed to create attribution:', dbError);
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 4. UPDATE MEMBER LAST ACTIVE
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    try {
      await prisma.member.update({
        where: { id: member.id },
        data: { lastActive: new Date() }
      });
    } catch (updateError) {
      // Non-critical, just log
      logger.error('⚠️ Failed to update lastActive:', updateError);
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 5. REDIRECT TO PRODUCT PAGE
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    return redirectToProduct(member.creator.productId, code);

  } catch (error) {
    logger.error('❌ Referral redirect error:', error);
    return redirectWithError('server_error');
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HELPER: Redirect to product page with referral cookie
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function redirectToProduct(productId: string, referralCode: string): NextResponse {
  const whopProductUrl = `https://whop.com/products/${productId}`;

  const response = NextResponse.redirect(whopProductUrl);

  // Set referral cookie (30 days)
  response.cookies.set('ref_code', referralCode, {
    maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  });

  return response;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HELPER: Redirect to discover page with error parameter
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function redirectWithError(errorCode: string): NextResponse {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const errorMessages: Record<string, string> = {
    invalid_code: 'This referral link is invalid or expired.',
    server_error: 'An error occurred. Please try again later.',
  };

  const redirectUrl = new URL('/discover', appUrl);
  redirectUrl.searchParams.set('error', errorCode);
  redirectUrl.searchParams.set('message', errorMessages[errorCode] || 'Unknown error');

  return NextResponse.redirect(redirectUrl.toString());
}
