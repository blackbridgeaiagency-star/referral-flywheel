import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/db/prisma';
import { getCompleteCreatorDashboardData } from '../../../../../lib/data/centralized-queries';
import logger from '../../../../../lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteParams {
  params: {
    companyId: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { companyId } = params;

    if (!companyId) {
      return NextResponse.json({ ok: false, error: 'Missing companyId' }, { status: 400 });
    }

    // Find creator by companyId or productId
    const isCompanyId = companyId.startsWith('biz_');
    const creator = await prisma.creator.findFirst({
      where: isCompanyId ? { companyId } : { productId: companyId },
      select: {
        id: true,
        productId: true,
        companyName: true,
      },
    });

    if (!creator) {
      return NextResponse.json({ ok: false, error: 'Creator not found' }, { status: 404 });
    }

    // Fetch complete dashboard data
    const dashboardData = await getCompleteCreatorDashboardData(creator.productId);

    return NextResponse.json({
      ok: true,
      data: {
        revenueStats: dashboardData.revenueStats,
        topReferrers: dashboardData.topReferrers,
        topPerformerContribution: dashboardData.topPerformerContribution,
      },
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error fetching creator stats:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
