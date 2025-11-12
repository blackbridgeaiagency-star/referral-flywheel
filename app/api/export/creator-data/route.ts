// app/api/export/creator-data/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db/prisma';
import { withRateLimit } from '../../../../lib/middleware/rate-limit';
import { stringify } from 'csv-stringify/sync';
import ExcelJS from 'exceljs';
import logger from '../../../../lib/logger';


/**
 * Creator Data Export API
 *
 * Allows creators to export their data in various formats:
 * - CSV: Simple, compatible with all spreadsheet apps
 * - Excel: Rich formatting with multiple sheets
 * - JSON: Raw data for programmatic use
 */

export async function GET(request: NextRequest) {
  return withRateLimit(request, async (request) => {
    try {
      const searchParams = request.nextUrl.searchParams;
      const creatorId = searchParams.get('creatorId');
      const format = searchParams.get('format') || 'csv';
      const dateFrom = searchParams.get('from');
      const dateTo = searchParams.get('to');
      const dataType = searchParams.get('type') || 'all'; // all, members, commissions, analytics

      if (!creatorId) {
        return NextResponse.json(
          { error: 'Creator ID required' },
          { status: 400 }
        );
      }

      // Verify creator exists
      const creator = await prisma.creator.findUnique({
        where: { id: creatorId },
      });

      if (!creator) {
        return NextResponse.json(
          { error: 'Creator not found' },
          { status: 404 }
        );
      }

      // Date filters
      const dateFilter = {
        ...(dateFrom && { gte: new Date(dateFrom) }),
        ...(dateTo && { lte: new Date(dateTo) }),
      };

      // Fetch data based on type
      const exportData = await gatherExportData(creatorId, dataType, dateFilter);

      // Generate export based on format
      let response: NextResponse;

      switch (format.toLowerCase()) {
        case 'excel':
        case 'xlsx':
          response = await generateExcelExport(exportData, creator.companyName);
          break;
        case 'json':
          response = generateJsonExport(exportData);
          break;
        case 'csv':
        default:
          response = generateCsvExport(exportData, dataType);
          break;
      }

      // Log export event
      logger.info(' Data export for creator ${creatorId}: ${format} format, ${dataType} data');

      return response;

    } catch (error) {
      logger.error('Export failed:', error);
      return NextResponse.json(
        { error: 'Export failed', message: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  }, 'creator');
}

/**
 * Gather all export data
 */
async function gatherExportData(
  creatorId: string,
  dataType: string,
  dateFilter: any
) {
  const data: any = {
    exportDate: new Date().toISOString(),
    creatorId,
  };

  // Fetch based on data type
  if (dataType === 'all' || dataType === 'members') {
    data.members = await prisma.member.findMany({
      where: { creatorId },
      select: {
        id: true,
        username: true,
        email: true,
        referralCode: true,
        referredBy: true,
        memberOrigin: true,
        subscriptionPrice: true,
        lifetimeEarnings: true,
        monthlyEarnings: true,
        totalReferred: true,
        monthlyReferred: true,
        globalEarningsRank: true,
        globalReferralsRank: true,
        createdAt: true,
        lastActive: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  if (dataType === 'all' || dataType === 'commissions') {
    data.commissions = await prisma.commission.findMany({
      where: {
        creatorId,
        createdAt: dateFilter,
      },
      select: {
        id: true,
        whopPaymentId: true,
        whopMembershipId: true,
        saleAmount: true,
        memberShare: true,
        creatorShare: true,
        platformShare: true,
        paymentType: true,
        status: true,
        paidAt: true,
        createdAt: true,
        member: {
          select: {
            username: true,
            referralCode: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  if (dataType === 'all' || dataType === 'analytics') {
    // Calculate analytics
    const [
      totalRevenue,
      monthlyRevenue,
      totalMembers,
      referredMembers,
      organicMembers,
      topEarners,
      topReferrers,
      monthlyGrowth,
    ] = await Promise.all([
      // Total revenue
      prisma.commission.aggregate({
        where: { creatorId, status: 'paid' },
        _sum: { saleAmount: true },
      }),

      // Monthly revenue
      prisma.commission.aggregate({
        where: {
          creatorId,
          status: 'paid',
          createdAt: {
            gte: new Date(new Date().setDate(1)),
          },
        },
        _sum: { saleAmount: true },
      }),

      // Total members
      prisma.member.count({
        where: { creatorId },
      }),

      // Referred members
      prisma.member.count({
        where: {
          creatorId,
          referredBy: { not: null },
        },
      }),

      // Organic members
      prisma.member.count({
        where: {
          creatorId,
          referredBy: null,
        },
      }),

      // Top earners
      prisma.member.findMany({
        where: { creatorId },
        orderBy: { lifetimeEarnings: 'desc' },
        take: 10,
        select: {
          username: true,
          referralCode: true,
          lifetimeEarnings: true,
          totalReferred: true,
        },
      }),

      // Top referrers
      prisma.member.findMany({
        where: { creatorId },
        orderBy: { totalReferred: 'desc' },
        take: 10,
        select: {
          username: true,
          referralCode: true,
          totalReferred: true,
          lifetimeEarnings: true,
        },
      }),

      // Monthly growth data
      getMonthlyGrowth(creatorId),
    ]);

    data.analytics = {
      summary: {
        totalRevenue: totalRevenue._sum.saleAmount || 0,
        monthlyRevenue: monthlyRevenue._sum.saleAmount || 0,
        totalMembers,
        referredMembers,
        organicMembers,
        conversionRate: totalMembers > 0 ? (referredMembers / totalMembers) * 100 : 0,
      },
      topEarners,
      topReferrers,
      monthlyGrowth,
    };
  }

  return data;
}

/**
 * Generate CSV export
 */
function generateCsvExport(data: any, dataType: string): NextResponse {
  let csvContent = '';
  let filename = `export-${dataType}-${Date.now()}.csv`;

  if (data.members) {
    const headers = [
      'ID', 'Username', 'Email', 'Referral Code', 'Referred By',
      'Origin', 'Subscription Price', 'Lifetime Earnings', 'Total Referrals',
      'Joined Date', 'Last Active'
    ];

    const rows = data.members.map((m: any) => [
      m.id,
      m.username,
      m.email,
      m.referralCode,
      m.referredBy || 'N/A',
      m.memberOrigin,
      m.subscriptionPrice,
      m.lifetimeEarnings,
      m.totalReferred,
      new Date(m.createdAt).toLocaleDateString(),
      m.lastActive ? new Date(m.lastActive).toLocaleDateString() : 'N/A',
    ]);

    csvContent = stringify([headers, ...rows]);
  } else if (data.commissions) {
    const headers = [
      'ID', 'Payment ID', 'Member', 'Sale Amount', 'Member Share',
      'Creator Share', 'Platform Share', 'Type', 'Status', 'Date'
    ];

    const rows = data.commissions.map((c: any) => [
      c.id,
      c.whopPaymentId,
      c.member?.username || 'N/A',
      c.saleAmount,
      c.memberShare,
      c.creatorShare,
      c.platformShare,
      c.paymentType,
      c.status,
      new Date(c.createdAt).toLocaleDateString(),
    ]);

    csvContent = stringify([headers, ...rows]);
  } else if (data.analytics) {
    // Export analytics summary as CSV
    const summary = data.analytics.summary;
    const headers = ['Metric', 'Value'];
    const rows = [
      ['Total Revenue', `$${summary.totalRevenue.toFixed(2)}`],
      ['Monthly Revenue', `$${summary.monthlyRevenue.toFixed(2)}`],
      ['Total Members', summary.totalMembers],
      ['Referred Members', summary.referredMembers],
      ['Organic Members', summary.organicMembers],
      ['Conversion Rate', `${summary.conversionRate.toFixed(2)}%`],
    ];

    csvContent = stringify([headers, ...rows]);
  }

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}

/**
 * Generate Excel export with multiple sheets
 */
async function generateExcelExport(data: any, companyName: string): Promise<NextResponse> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Referral Flywheel';
  workbook.created = new Date();

  // Summary sheet
  if (data.analytics) {
    const summarySheet = workbook.addWorksheet('Summary');

    // Add title
    summarySheet.mergeCells('A1:D1');
    summarySheet.getCell('A1').value = `${companyName} - Referral Analytics`;
    summarySheet.getCell('A1').font = { size: 16, bold: true };

    // Add summary data
    summarySheet.addRow([]);
    summarySheet.addRow(['Metric', 'Value']);
    summarySheet.addRow(['Total Revenue', `$${data.analytics.summary.totalRevenue.toFixed(2)}`]);
    summarySheet.addRow(['Monthly Revenue', `$${data.analytics.summary.monthlyRevenue.toFixed(2)}`]);
    summarySheet.addRow(['Total Members', data.analytics.summary.totalMembers]);
    summarySheet.addRow(['Referred Members', data.analytics.summary.referredMembers]);
    summarySheet.addRow(['Organic Members', data.analytics.summary.organicMembers]);

    // Style the sheet
    summarySheet.getColumn(1).width = 20;
    summarySheet.getColumn(2).width = 15;
  }

  // Members sheet
  if (data.members) {
    const membersSheet = workbook.addWorksheet('Members');

    // Add headers
    membersSheet.columns = [
      { header: 'Username', key: 'username', width: 20 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Referral Code', key: 'referralCode', width: 20 },
      { header: 'Lifetime Earnings', key: 'lifetimeEarnings', width: 15 },
      { header: 'Total Referrals', key: 'totalReferred', width: 15 },
      { header: 'Joined', key: 'createdAt', width: 15 },
    ];

    // Add data
    data.members.forEach((member: any) => {
      membersSheet.addRow({
        ...member,
        lifetimeEarnings: `$${member.lifetimeEarnings.toFixed(2)}`,
        createdAt: new Date(member.createdAt).toLocaleDateString(),
      });
    });

    // Style headers
    membersSheet.getRow(1).font = { bold: true };
    membersSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };
  }

  // Commissions sheet
  if (data.commissions) {
    const commissionsSheet = workbook.addWorksheet('Commissions');

    commissionsSheet.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Member', key: 'member', width: 20 },
      { header: 'Amount', key: 'amount', width: 15 },
      { header: 'Type', key: 'type', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
    ];

    data.commissions.forEach((commission: any) => {
      commissionsSheet.addRow({
        date: new Date(commission.createdAt).toLocaleDateString(),
        member: commission.member?.username || 'N/A',
        amount: `$${commission.saleAmount.toFixed(2)}`,
        type: commission.paymentType,
        status: commission.status,
      });
    });

    commissionsSheet.getRow(1).font = { bold: true };
    commissionsSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };
  }

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${companyName}-export-${Date.now()}.xlsx"`,
    },
  });
}

/**
 * Generate JSON export
 */
function generateJsonExport(data: any): NextResponse {
  return NextResponse.json(data, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="export-${Date.now()}.json"`,
    },
  });
}

/**
 * Get monthly growth data
 */
async function getMonthlyGrowth(creatorId: string) {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const monthlyData = await prisma.commission.groupBy({
    by: ['createdAt'],
    where: {
      creatorId,
      status: 'paid',
      createdAt: { gte: sixMonthsAgo },
    },
    _sum: {
      saleAmount: true,
    },
  });

  // Group by month
  const monthlyGrowth: Record<string, number> = {};

  monthlyData.forEach(item => {
    const month = new Date(item.createdAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
    });
    monthlyGrowth[month] = (monthlyGrowth[month] || 0) + (item._sum.saleAmount || 0);
  });

  return monthlyGrowth;
}