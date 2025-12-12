// app/api/member/update-code/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db/prisma';
import { withRateLimit } from '../../../../lib/security/rate-limit-utils';
import logger from '../../../../lib/logger';
import { canAccessMemberById } from '../../../../lib/whop/simple-auth';
import { checkOrigin } from '../../../../lib/security/origin-validation';


/**
 * POST /api/member/update-code
 * Update a member's referral code
 *
 * SECURITY: Requires authorization - user must own the member resource
 */
export async function POST(request: NextRequest) {
  // SECURITY: Origin validation for CSRF protection
  const originError = checkOrigin(request);
  if (originError) return originError;

  return withRateLimit(request, async () => {
    try {
      const { memberId, newCode } = await request.json();

      if (!memberId || !newCode) {
        return NextResponse.json(
          { error: 'Missing required fields' },
          { status: 400 }
        );
      }

      // SECURITY: Verify user is authorized to modify this member's data
      const isAuthorized = await canAccessMemberById(memberId);
      if (!isAuthorized) {
        logger.warn(`[SECURITY] Unauthorized referral code update attempt for member: ${memberId}`);
        return NextResponse.json(
          { error: 'Unauthorized - you do not have permission to modify this resource' },
          { status: 403 }
        );
      }

      // Validate code format
      const codeRegex = /^[A-Z0-9-]{3,20}$/;
      if (!codeRegex.test(newCode)) {
        return NextResponse.json(
          { error: 'Invalid code format. Use 3-20 characters (A-Z, 0-9, hyphens only)' },
          { status: 400 }
        );
      }

      // Check if code is already taken
      const existingMember = await prisma.member.findUnique({
        where: { referralCode: newCode },
      });

      if (existingMember && existingMember.id !== memberId) {
        return NextResponse.json(
          { error: 'This code is already taken. Please choose another.' },
          { status: 409 }
        );
      }

      // Update the member's referral code
      const updatedMember = await prisma.member.update({
        where: { id: memberId },
        data: { referralCode: newCode },
      });

      console.log('✅ Referral code updated:', {
        memberId,
        oldCode: updatedMember.referralCode,
        newCode,
      });

      return NextResponse.json({
        success: true,
        referralCode: updatedMember.referralCode,
      });
    } catch (error) {
      logger.error('❌ Error updating referral code:', error);
      return NextResponse.json(
        { error: 'Failed to update referral code' },
        { status: 500 }
      );
    }
  }, 'STANDARD');
}
