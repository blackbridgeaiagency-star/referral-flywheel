import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/db/prisma';
import { applyRateLimit } from '../../../lib/security/rate-limit-utils';
import { extractRealIP } from '../../../lib/utils/ip-hash';
import logger from '../../../lib/logger';

// Whop API configuration for auto-fetching username
const WHOP_API_KEY = process.env.WHOP_API_KEY;
const WHOP_API_BASE = 'https://api.whop.com/api/v2';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Referral Link Redirect Route (Strategy B: Whop-Native Attribution)
 *
 * Handles referral link clicks: /r/FIRSTNAME-ABC123
 *
 * NEW STRATEGY B FLOW:
 * 1. Look up member by their referralCode (our vanity code)
 * 2. Get their whopUsername
 * 3. Redirect to Whop product page with ?a=whopUsername
 * 4. Whop handles ALL attribution natively
 * 5. We read affiliate_username from webhook
 *
 * NO MORE:
 * - Cookies
 * - Fingerprinting
 * - AttributionClick records
 * - 30-day windows (Whop handles this)
 */

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    // Rate limiting (prevent click farming)
    const realIP = extractRealIP(request) || 'unknown';
    const rateLimitResult = await applyRateLimit(
      `referral-redirect:${realIP}`,
      30,  // 30 clicks per minute max
      60000 // 1 minute window
    );

    if (!rateLimitResult.success) {
      logger.warn(`Rate limit exceeded for IP: ${realIP}`);
      const retryAfterSeconds = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        {
          error: 'Too many requests',
          message: 'You are clicking referral links too quickly. Please wait a moment.',
          retryAfter: retryAfterSeconds,
        },
        {
          status: 429,
          headers: { 'Retry-After': retryAfterSeconds.toString() }
        }
      );
    }

    const { code } = params;

    // Validate referral code format
    if (!code || code.length < 5) {
      logger.error('Invalid referral code format:', code);
      return redirectWithError('invalid_code');
    }

    logger.info(`Referral click: ${code}`);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 1. FIND MEMBER BY REFERRAL CODE (our vanity code)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const member = await prisma.member.findUnique({
      where: { referralCode: code },
      select: {
        id: true,
        membershipId: true,
        whopUsername: true,
        username: true,
        creator: {
          select: {
            productId: true,
            companyId: true,
          }
        }
      }
    });

    if (!member) {
      logger.error('Member not found for code:', code);
      return redirectWithError('invalid_code');
    }

    if (!member.creator) {
      logger.error('Creator not found for member');
      return redirectWithError('invalid_code');
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 2. GET WHOP USERNAME FOR ?a= PARAMETER (auto-fetch if missing)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    let affiliateUsername = member.whopUsername;

    // If whopUsername is not set, try to auto-fetch from Whop API
    if (!affiliateUsername && member.membershipId && WHOP_API_KEY) {
      logger.info(`Attempting to auto-fetch whopUsername for ${code}...`);

      try {
        const response = await fetch(
          `${WHOP_API_BASE}/memberships/${member.membershipId}`,
          {
            headers: {
              'Authorization': `Bearer ${WHOP_API_KEY}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          const fetchedUsername = data.user?.username || data.username;

          if (fetchedUsername) {
            // Update member with fetched username
            await prisma.member.update({
              where: { id: member.id },
              data: { whopUsername: fetchedUsername.toLowerCase() },
            });

            affiliateUsername = fetchedUsername.toLowerCase();
            logger.info(`Auto-fetched and saved whopUsername: ${affiliateUsername}`);
          }
        }
      } catch (fetchError) {
        logger.error('Failed to auto-fetch whopUsername:', fetchError);
      }
    }

    if (!affiliateUsername) {
      // Could not get whopUsername - show error page instead of losing the referral
      logger.warn(`Member ${code} has no whopUsername - showing setup prompt`);
      return redirectWithError('username_required');
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 3. UPDATE MEMBER LAST ACTIVE (non-blocking)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    prisma.member.update({
      where: { id: member.id },
      data: { lastActive: new Date() }
    }).catch(err => logger.error('Failed to update lastActive:', err));

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 4. REDIRECT TO WHOP WITH ?a=whopUsername
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    logger.info(`Redirecting to Whop with affiliate: ${affiliateUsername}`);
    return redirectToProduct(member.creator.productId, affiliateUsername);

  } catch (error) {
    logger.error('Referral redirect error:', error);
    return redirectWithError('server_error');
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HELPER: Redirect to Whop product page with ?a= affiliate parameter
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function redirectToProduct(productId: string, whopUsername: string | null): NextResponse {
  // Build Whop product URL
  const baseUrl = `https://whop.com/products/${productId}`;

  // If we have a whopUsername, add affiliate parameter
  const redirectUrl = whopUsername
    ? `${baseUrl}?a=${encodeURIComponent(whopUsername)}`
    : baseUrl;

  logger.info(`Redirecting to: ${redirectUrl}`);

  // Simple redirect - no cookies, no fingerprinting
  // Whop will handle all attribution via the ?a= parameter
  return NextResponse.redirect(redirectUrl);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HELPER: Redirect to discover page with error parameter
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function redirectWithError(errorCode: string): NextResponse {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const errorMessages: Record<string, string> = {
    invalid_code: 'This referral link is invalid or expired.',
    server_error: 'An error occurred. Please try again later.',
    username_required: 'The referrer needs to complete their account setup. Ask them to connect their Whop username in their dashboard.',
  };

  const redirectUrl = new URL('/discover', appUrl);
  redirectUrl.searchParams.set('error', errorCode);
  redirectUrl.searchParams.set('message', errorMessages[errorCode] || 'Unknown error');

  return NextResponse.redirect(redirectUrl.toString());
}
