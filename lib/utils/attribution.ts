// lib/utils/attribution.ts
import { prisma } from '../db/prisma';

/**
 * Check for attribution via cookie or database lookup
 * Returns the referral code if found within 30-day window
 *
 * @param request - The incoming request object
 * @param userId - Optional user ID for additional tracking
 * @returns Attribution object with referralCode and id, or null if not found
 */
export async function checkAttribution(
  request: Request,
  userId?: string
): Promise<{ referralCode: string; id: string } | null> {
  try {
    // 1. Check cookie first (primary method)
    // In API routes, cookies come from request.headers
    const cookieHeader = request.headers.get('cookie');
    let refCodeValue: string | null = null;

    if (cookieHeader) {
      // Parse cookie header manually for API routes
      const cookies = cookieHeader.split(';').map(c => c.trim());
      const refCookie = cookies.find(c => c.startsWith('ref_code='));
      if (refCookie) {
        refCodeValue = refCookie.split('=')[1];
      }
    }

    if (refCodeValue) {
      // Validate the click is still within 30 days
      const click = await prisma.attributionClick.findFirst({
        where: {
          referralCode: refCodeValue,
          expiresAt: { gte: new Date() },
          converted: false,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (click) {
        console.log('✅ Attribution found via cookie:', refCodeValue);
        return { referralCode: click.referralCode, id: click.id };
      } else {
        console.log('⚠️  Cookie found but attribution expired or converted');
      }
    }

    // 2. Fallback: Check database by fingerprint (if cookie was cleared)
    const fingerprint = await import('./fingerprint').then(m =>
      m.generateFingerprint(request)
    );

    const click = await prisma.attributionClick.findFirst({
      where: {
        fingerprint,
        expiresAt: { gte: new Date() },
        converted: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (click) {
      console.log('✅ Attribution found via fingerprint:', click.referralCode);
      return { referralCode: click.referralCode, id: click.id };
    }

    console.log('ℹ️  No attribution found (organic signup)');
    return null;

  } catch (error) {
    console.error('❌ Error checking attribution:', error);
    // Return null instead of throwing - organic signup is acceptable
    return null;
  }
}
