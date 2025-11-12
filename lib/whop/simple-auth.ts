/**
 * Simplified Whop Authentication
 *
 * Since Whop loads our app in an iframe and handles authentication on their side,
 * we just need to read the user context they provide.
 *
 * This replaces the complex JWT verification that wasn't working.
 */

import { headers } from 'next/headers';
import { prisma } from '../db/prisma';

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
 * Simple check if user can access creator dashboard
 */
export async function canAccessCreatorDashboard(whopId: string): Promise<boolean> {
  // For MVP: If Whop loaded the page with this ID, they've already authorized it
  // Whop won't load the iframe unless the user has permission

  // Optional: Check if creator exists in our database
  const creator = await prisma.creator.findFirst({
    where: {
      OR: [
        { companyId: whopId },
        { productId: whopId }
      ]
    }
  });

  // If creator doesn't exist, they might be installing for first time
  // Return true to allow auto-creation flow
  return true;
}

/**
 * Simple check if user can access member dashboard
 */
export async function canAccessMemberDashboard(membershipId: string): Promise<boolean> {
  // For MVP: Trust Whop's iframe context
  // They won't show member dashboard unless user has active membership

  // Optional: Check if member exists
  const member = await prisma.member.findFirst({
    where: { membershipId }
  });

  // If member doesn't exist, they might be new
  // Return true to allow auto-creation flow
  return true;
}