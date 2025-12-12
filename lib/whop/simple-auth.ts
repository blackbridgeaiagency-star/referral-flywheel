/**
 * Whop Authentication with Real Authorization Checks
 *
 * SECURITY: This module implements proper authorization verification.
 * - Reads user context from Whop-provided headers
 * - Verifies user ownership via database queries
 * - Returns false by default (deny-first approach)
 */

import { headers } from 'next/headers';
import { prisma } from '../db/prisma';
import logger from '../logger';

export interface WhopContext {
  userId?: string;
  companyId?: string;
  membershipId?: string;
  isAuthenticated: boolean;
}

/**
 * Get Whop context from headers/params
 * Whop provides context when loading the app
 */
export async function getWhopContext(): Promise<WhopContext> {
  const headersList = headers();

  // Check multiple possible sources for Whop data
  const userId = headersList.get('x-whop-user-id') ||
                 headersList.get('x-whop-user') ||
                 undefined;

  const companyId = headersList.get('x-whop-company-id') ||
                    headersList.get('x-company-id') ||
                    undefined;

  const membershipId = headersList.get('x-whop-membership-id') ||
                       headersList.get('x-membership-id') ||
                       undefined;

  return {
    userId,
    companyId,
    membershipId,
    isAuthenticated: !!(userId || companyId || membershipId)
  };
}

/**
 * Check if the current user can access a creator dashboard
 *
 * SECURITY: Verifies the requesting user owns/manages this creator resource.
 * Returns false by default - explicit verification required.
 *
 * @param creatorIdOrCompanyId - Either the internal creator ID or Whop company ID
 * @returns true only if user is verified owner, false otherwise
 */
export async function canAccessCreatorDashboard(creatorIdOrCompanyId: string): Promise<boolean> {
  try {
    const context = await getWhopContext();

    // No user context = no access
    if (!context.userId) {
      logger.warn(`[AUTH] Creator dashboard access denied - no userId in context`, {
        attemptedResource: creatorIdOrCompanyId
      });
      return false;
    }

    // Find the creator by either internal ID or Whop company/product ID
    const creator = await prisma.creator.findFirst({
      where: {
        OR: [
          { id: creatorIdOrCompanyId },
          { companyId: creatorIdOrCompanyId },
          { productId: creatorIdOrCompanyId }
        ]
      },
      select: {
        id: true,
        companyId: true
      }
    });

    // Creator doesn't exist - deny access
    // NOTE: For first-time installation, the app should create the creator record
    // during the installation flow, not here during authorization check
    if (!creator) {
      logger.warn(`[AUTH] Creator dashboard access denied - creator not found`, {
        attemptedResource: creatorIdOrCompanyId,
        userId: context.userId
      });
      return false;
    }

    // Verify the requesting user's company matches the creator's company
    // The user must have the same companyId in their context as the creator
    if (context.companyId && context.companyId === creator.companyId) {
      return true;
    }

    // Log unauthorized access attempt
    logger.warn(`[AUTH] Creator dashboard access denied - user does not own resource`, {
      attemptedResource: creatorIdOrCompanyId,
      userId: context.userId,
      userCompanyId: context.companyId,
      creatorCompanyId: creator.companyId
    });

    return false;
  } catch (error) {
    logger.error(`[AUTH] Error checking creator dashboard access`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      attemptedResource: creatorIdOrCompanyId
    });
    // On error, deny access (fail secure)
    return false;
  }
}

/**
 * Check if the current user can access a member dashboard
 *
 * SECURITY: Verifies the requesting user owns this member resource.
 * Returns false by default - explicit verification required.
 *
 * @param memberIdOrMembershipId - Either the internal member ID or Whop membership ID
 * @returns true only if user is verified owner, false otherwise
 */
export async function canAccessMemberDashboard(memberIdOrMembershipId: string): Promise<boolean> {
  try {
    const context = await getWhopContext();

    // No user context = no access
    if (!context.userId) {
      logger.warn(`[AUTH] Member dashboard access denied - no userId in context`, {
        attemptedResource: memberIdOrMembershipId
      });
      return false;
    }

    // Find the member by either internal ID or Whop membership ID
    const member = await prisma.member.findFirst({
      where: {
        OR: [
          { id: memberIdOrMembershipId },
          { membershipId: memberIdOrMembershipId }
        ]
      },
      select: {
        id: true,
        userId: true,
        membershipId: true
      }
    });

    // Member doesn't exist - deny access
    // NOTE: For new members, the app should create the member record
    // during the onboarding flow, not here during authorization check
    if (!member) {
      logger.warn(`[AUTH] Member dashboard access denied - member not found`, {
        attemptedResource: memberIdOrMembershipId,
        userId: context.userId
      });
      return false;
    }

    // Verify the requesting user owns this member record
    // The user's ID must match the member's userId
    if (member.userId === context.userId) {
      return true;
    }

    // Also check if the membership ID in context matches
    if (context.membershipId && context.membershipId === member.membershipId) {
      return true;
    }

    // Log unauthorized access attempt
    logger.warn(`[AUTH] Member dashboard access denied - user does not own resource`, {
      attemptedResource: memberIdOrMembershipId,
      contextUserId: context.userId,
      memberUserId: member.userId,
      contextMembershipId: context.membershipId,
      memberMembershipId: member.membershipId
    });

    return false;
  } catch (error) {
    logger.error(`[AUTH] Error checking member dashboard access`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      attemptedResource: memberIdOrMembershipId
    });
    // On error, deny access (fail secure)
    return false;
  }
}

/**
 * Check if user can access a creator resource by creator's internal ID
 * Used when we have the internal database ID, not the Whop ID
 *
 * @param creatorId - The internal creator ID (cuid)
 * @returns true only if user is verified owner, false otherwise
 */
export async function canAccessCreatorById(creatorId: string): Promise<boolean> {
  try {
    const context = await getWhopContext();

    if (!context.userId || !context.companyId) {
      logger.warn(`[AUTH] Creator access by ID denied - missing context`, {
        attemptedResource: creatorId,
        hasUserId: !!context.userId,
        hasCompanyId: !!context.companyId
      });
      return false;
    }

    // Find creator by internal ID and verify company ownership
    const creator = await prisma.creator.findUnique({
      where: { id: creatorId },
      select: { companyId: true }
    });

    if (!creator) {
      logger.warn(`[AUTH] Creator access by ID denied - not found`, {
        attemptedResource: creatorId,
        userId: context.userId
      });
      return false;
    }

    if (creator.companyId === context.companyId) {
      return true;
    }

    logger.warn(`[AUTH] Creator access by ID denied - company mismatch`, {
      attemptedResource: creatorId,
      userId: context.userId,
      userCompanyId: context.companyId,
      creatorCompanyId: creator.companyId
    });

    return false;
  } catch (error) {
    logger.error(`[AUTH] Error checking creator access by ID`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      attemptedResource: creatorId
    });
    return false;
  }
}

/**
 * Check if user can access a member resource by member's internal ID
 * Used when we have the internal database ID, not the Whop membership ID
 *
 * @param memberId - The internal member ID (cuid)
 * @returns true only if user is verified owner, false otherwise
 */
export async function canAccessMemberById(memberId: string): Promise<boolean> {
  try {
    const context = await getWhopContext();

    if (!context.userId) {
      logger.warn(`[AUTH] Member access by ID denied - no userId`, {
        attemptedResource: memberId
      });
      return false;
    }

    // Find member by internal ID and verify user ownership
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: { userId: true }
    });

    if (!member) {
      logger.warn(`[AUTH] Member access by ID denied - not found`, {
        attemptedResource: memberId,
        userId: context.userId
      });
      return false;
    }

    if (member.userId === context.userId) {
      return true;
    }

    logger.warn(`[AUTH] Member access by ID denied - user mismatch`, {
      attemptedResource: memberId,
      contextUserId: context.userId,
      memberUserId: member.userId
    });

    return false;
  } catch (error) {
    logger.error(`[AUTH] Error checking member access by ID`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      attemptedResource: memberId
    });
    return false;
  }
}

/**
 * Check if the current user is a platform administrator
 *
 * SECURITY: Verifies the requesting user is in the admin list.
 * Admin user IDs are configured via ADMIN_USER_IDS environment variable.
 * Returns false by default - explicit verification required.
 *
 * @returns true only if user is a verified admin, false otherwise
 */
export async function isAdmin(): Promise<boolean> {
  try {
    const context = await getWhopContext();

    // No user context = no admin access
    if (!context.userId) {
      logger.warn(`[AUTH] Admin access denied - no userId in context`);
      return false;
    }

    // Get admin user IDs from environment variable
    const adminUserIds = process.env.ADMIN_USER_IDS?.split(',').map(id => id.trim()).filter(Boolean) || [];

    // If no admins configured, deny all admin access
    if (adminUserIds.length === 0) {
      logger.warn(`[AUTH] Admin access denied - ADMIN_USER_IDS not configured`);
      return false;
    }

    // Check if user is in admin list
    if (adminUserIds.includes(context.userId)) {
      logger.info(`[AUTH] Admin access granted for user ${context.userId}`);
      return true;
    }

    // Log unauthorized admin access attempt
    logger.warn(`[AUTH] Admin access denied - user not in admin list`, {
      userId: context.userId
    });

    return false;
  } catch (error) {
    logger.error(`[AUTH] Error checking admin access`, {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    // On error, deny access (fail secure)
    return false;
  }
}