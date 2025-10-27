import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      productId,
      welcomeMessage,
      tier1Count,
      tier1Reward,
      tier2Count,
      tier2Reward,
      tier3Count,
      tier3Reward,
      tier4Count,
      tier4Reward
    } = body;

    // Validate required fields
    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required', code: 'MISSING_PRODUCT_ID' },
        { status: 400 }
      );
    }

    // Find the creator by productId
    let creator = await prisma.creator.findFirst({
      where: { productId }
    });

    // If creator doesn't exist, create it (for dev/testing)
    if (!creator) {
      console.log(`⚠️ Creator not found for product ${productId}, creating...`);

      // In production, this would come from Whop API
      creator = await prisma.creator.create({
        data: {
          companyId: `company_${Date.now()}`,
          companyName: 'New Community',
          productId,
          welcomeMessage,
          tier1Count: tier1Count || 5,
          tier1Reward: tier1Reward || 'Exclusive Discord role',
          tier2Count: tier2Count || 10,
          tier2Reward: tier2Reward || '$50 bonus',
          tier3Count: tier3Count || 25,
          tier3Reward: tier3Reward || '$150 bonus + coaching',
          tier4Count: tier4Count || 100,
          tier4Reward: tier4Reward || '$500 bonus + VIP',
          isActive: true
        }
      });

      console.log(`✅ Creator created: ${creator.id}`);
    } else {
      // Update existing creator with setup data
      creator = await prisma.creator.update({
        where: { id: creator.id },
        data: {
          welcomeMessage,
          tier1Count: tier1Count || 5,
          tier1Reward: tier1Reward || 'Exclusive Discord role',
          tier2Count: tier2Count || 10,
          tier2Reward: tier2Reward || '$50 bonus',
          tier3Count: tier3Count || 25,
          tier3Reward: tier3Reward || '$150 bonus + coaching',
          tier4Count: tier4Count || 100,
          tier4Reward: tier4Reward || '$500 bonus + VIP',
          isActive: true
        }
      });

      console.log(`✅ Creator updated: ${creator.id}`);
    }

    // TODO: Trigger member import from Whop API
    // This will be implemented in Phase 1.4
    console.log('📥 Member import will be triggered by install webhook');

    // TODO: Send welcome messages to all members
    // This will be implemented in Phase 2
    console.log('📧 Welcome messages will be sent via email service');

    return NextResponse.json({
      success: true,
      creator: {
        id: creator.id,
        productId: creator.productId,
        companyName: creator.companyName
      }
    });
  } catch (error) {
    console.error('❌ Setup completion error:', error);
    return NextResponse.json(
      {
        error: 'Failed to complete setup',
        code: 'SETUP_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
