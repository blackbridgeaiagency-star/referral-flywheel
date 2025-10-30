/**
 * Creator Data Synchronization with Whop API
 *
 * Fetches and syncs creator/company data from Whop to keep our database updated
 */

import { getCompany, getProduct, type WhopCompany, type WhopProduct } from './api-client';
import { prisma } from '../db/prisma';

export interface SyncedCreatorData {
  companyName: string;
  logoUrl: string | null;
  description: string | null;
}

/**
 * Fetch creator data from Whop API
 *
 * Tries multiple approaches to get the most accurate data:
 * 1. Fetch company data if companyId provided
 * 2. Fetch product data if productId provided
 * 3. Return defaults if API fails
 */
export async function fetchCreatorDataFromWhop(params: {
  companyId?: string;
  productId?: string;
}): Promise<SyncedCreatorData> {
  const { companyId, productId } = params;

  // Default fallback data
  // Note: This should rarely be used - the Whop API should provide company names
  const defaultData: SyncedCreatorData = {
    companyName: companyId || productId || 'Community',
    logoUrl: null,
    description: null,
  };

  try {
    // Priority 1: Fetch from company ID (most accurate)
    if (companyId) {
      console.log(`🔄 Fetching company data from Whop: ${companyId}`);
      const company = await getCompany(companyId);

      if (company) {
        console.log(`✅ Company data fetched: ${company.name}`);
        return {
          companyName: company.name || companyId,
          logoUrl: company.image_url || null,
          description: company.description || null,
        };
      }
    }

    // Priority 2: Fetch from product ID
    if (productId) {
      console.log(`🔄 Fetching product data from Whop: ${productId}`);
      const product = await getProduct(productId);

      if (product) {
        console.log(`✅ Product data fetched: ${product.name}`);
        return {
          companyName: product.name || productId,
          logoUrl: product.image_url || null,
          description: product.description || null,
        };
      }
    }

    console.warn('⚠️ No companyId or productId provided, using defaults');
    return defaultData;
  } catch (error) {
    console.error('❌ Failed to fetch creator data from Whop:', error);
    console.log('📝 Using default data as fallback');
    return defaultData;
  }
}

/**
 * Sync creator data from Whop to database
 *
 * Updates existing creator record with latest data from Whop API
 */
export async function syncCreatorWithWhop(creatorId: string): Promise<{
  success: boolean;
  updated: boolean;
  data?: SyncedCreatorData;
  error?: string;
}> {
  try {
    // Get existing creator
    const creator = await prisma.creator.findUnique({
      where: { id: creatorId },
      select: {
        id: true,
        companyId: true,
        productId: true,
        companyName: true,
        logoUrl: true,
        description: true,
      },
    });

    if (!creator) {
      return {
        success: false,
        updated: false,
        error: 'Creator not found',
      };
    }

    // Fetch latest data from Whop
    const whopData = await fetchCreatorDataFromWhop({
      companyId: creator.companyId,
      productId: creator.productId,
    });

    // Check if update is needed
    const needsUpdate =
      creator.companyName !== whopData.companyName ||
      creator.logoUrl !== whopData.logoUrl ||
      creator.description !== whopData.description;

    if (!needsUpdate) {
      console.log(`✅ Creator ${creatorId} is already up to date`);
      return {
        success: true,
        updated: false,
        data: whopData,
      };
    }

    // Update creator in database
    await prisma.creator.update({
      where: { id: creatorId },
      data: {
        companyName: whopData.companyName,
        logoUrl: whopData.logoUrl,
        description: whopData.description,
      },
    });

    console.log(`✅ Creator ${creatorId} synced with Whop data`);
    return {
      success: true,
      updated: true,
      data: whopData,
    };
  } catch (error) {
    console.error(`❌ Failed to sync creator ${creatorId}:`, error);
    return {
      success: false,
      updated: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Batch sync all creators with Whop
 *
 * Useful for periodic background jobs to keep all creator data fresh
 */
export async function syncAllCreatorsWithWhop(): Promise<{
  total: number;
  synced: number;
  failed: number;
  skipped: number;
}> {
  console.log('🔄 Starting batch sync of all creators...');

  const creators = await prisma.creator.findMany({
    where: { isActive: true },
    select: { id: true },
  });

  let synced = 0;
  let failed = 0;
  let skipped = 0;

  for (const creator of creators) {
    const result = await syncCreatorWithWhop(creator.id);

    if (result.success && result.updated) {
      synced++;
    } else if (result.success && !result.updated) {
      skipped++;
    } else {
      failed++;
    }

    // Rate limit: Wait 100ms between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`✅ Batch sync complete: ${synced} synced, ${skipped} skipped, ${failed} failed`);

  return {
    total: creators.length,
    synced,
    failed,
    skipped,
  };
}

/**
 * Create creator with Whop data
 *
 * Fetches data from Whop before creating the creator record
 * Used during initial creator onboarding
 */
export async function createCreatorWithWhopData(params: {
  companyId: string;
  productId: string;
}): Promise<{
  creatorId: string;
  companyName: string;
  logoUrl: string | null;
}> {
  // Fetch data from Whop first
  const whopData = await fetchCreatorDataFromWhop({
    companyId: params.companyId,
    productId: params.productId,
  });

  // Create creator with Whop data
  const creator = await prisma.creator.create({
    data: {
      companyId: params.companyId,
      productId: params.productId,
      companyName: whopData.companyName,
      logoUrl: whopData.logoUrl,
      description: whopData.description,
      // Default tier rewards (can be customized later)
      tier1Count: 3,
      tier1Reward: 'Early Supporter Badge',
      tier2Count: 5,
      tier2Reward: 'Community Champion Badge',
      tier3Count: 10,
      tier3Reward: 'VIP Access',
      tier4Count: 25,
      tier4Reward: 'Lifetime Pro Access',
      autoApproveRewards: false,
      welcomeMessage: `Welcome to ${whopData.companyName}! Share your unique referral link to earn 10% lifetime commission on every referral.`,
      // Custom competition rewards (disabled by default)
      customRewardEnabled: false,
      customRewardTimeframe: 'monthly',
      customRewardType: 'top_earners',
    },
  });

  console.log(`✅ Creator created with Whop data: ${creator.companyName} (${creator.id})`);

  return {
    creatorId: creator.id,
    companyName: creator.companyName,
    logoUrl: creator.logoUrl,
  };
}
