// lib/whop/checkout.ts
/**
 * Whop Checkout Sessions API
 *
 * Create checkout sessions with affiliate attribution.
 * Better than simple redirects - provides tracking metadata.
 */

import logger from '../logger';

const WHOP_API_BASE = 'https://api.whop.com/api/v2';
const WHOP_API_KEY = process.env.WHOP_API_KEY;

export interface CheckoutSessionOptions {
  planId: string;
  affiliateCode?: string;   // Whop username of the referrer
  metadata?: Record<string, string>;
  redirectUrl?: string;     // Where to send user after purchase
  discountCode?: string;    // Optional promo code
}

export interface CheckoutSessionResult {
  success: boolean;
  checkoutUrl?: string;
  sessionId?: string;
  error?: string;
}

/**
 * Create a checkout session with affiliate attribution
 *
 * This creates a proper checkout URL that:
 * - Attributes the sale to the affiliate
 * - Includes custom metadata for tracking
 * - Handles redirect after purchase
 */
export async function createCheckoutSession(
  options: CheckoutSessionOptions
): Promise<CheckoutSessionResult> {
  if (!WHOP_API_KEY) {
    logger.error('❌ WHOP_API_KEY not configured');
    return { success: false, error: 'WHOP_API_KEY not configured' };
  }

  const { planId, affiliateCode, metadata, redirectUrl, discountCode } = options;

  try {
    logger.info(`🛒 Creating checkout session for plan ${planId}${affiliateCode ? ` (affiliate: ${affiliateCode})` : ''}`);

    const body: Record<string, unknown> = {
      plan_id: planId,
    };

    // Add affiliate attribution
    if (affiliateCode) {
      body.affiliate_code = affiliateCode;
    }

    // Add tracking metadata
    if (metadata) {
      body.metadata = {
        ...metadata,
        source: 'referral_flywheel',
        created_at: new Date().toISOString(),
      };
    } else {
      body.metadata = {
        source: 'referral_flywheel',
        created_at: new Date().toISOString(),
      };
    }

    // Add redirect URL
    if (redirectUrl) {
      body.redirect_url = redirectUrl;
    }

    // Add discount code
    if (discountCode) {
      body.promo_code = discountCode;
    }

    const response = await fetch(`${WHOP_API_BASE}/checkout-sessions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHOP_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`❌ Checkout session creation failed (${response.status}): ${errorText}`);
      return { success: false, error: `API error: ${response.status} ${errorText}` };
    }

    const result = await response.json();
    const checkoutUrl = result.checkout_url || result.data?.checkout_url || result.url;
    const sessionId = result.id || result.data?.id;

    if (!checkoutUrl) {
      logger.warn(`⚠️ Checkout session created but no URL returned:`, result);
      return { success: false, error: 'No checkout URL in response' };
    }

    logger.info(`✅ Checkout session created: ${sessionId}`);

    return {
      success: true,
      checkoutUrl,
      sessionId,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`❌ Checkout session error:`, error);
    return { success: false, error: errorMsg };
  }
}

/**
 * Create a referral checkout URL
 *
 * Convenience function that creates a checkout session for a referral.
 * Use this in the /r/[code] route instead of simple redirect.
 */
export async function createReferralCheckout(
  planId: string,
  referrerUsername: string,
  referralCode: string,
  productUrl?: string
): Promise<CheckoutSessionResult> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://referral-flywheel.vercel.app';

  return createCheckoutSession({
    planId,
    affiliateCode: referrerUsername,
    metadata: {
      referral_code: referralCode,
      referrer_username: referrerUsername,
    },
    redirectUrl: productUrl || `${appUrl}/welcome`,
  });
}

/**
 * Generate a simple affiliate redirect URL
 *
 * Fallback method using Whop's native ?a= parameter.
 * Use when checkout session API isn't needed.
 */
export function generateAffiliateUrl(
  productUrl: string,
  affiliateUsername: string
): string {
  const url = new URL(productUrl);
  url.searchParams.set('a', affiliateUsername);
  return url.toString();
}

/**
 * Generate affiliate URL from company route
 */
export function generateAffiliateUrlFromRoute(
  companyRoute: string,
  affiliateUsername: string
): string {
  return `https://whop.com/${companyRoute}?a=${affiliateUsername}`;
}

export default {
  createCheckoutSession,
  createReferralCheckout,
  generateAffiliateUrl,
  generateAffiliateUrlFromRoute,
};
