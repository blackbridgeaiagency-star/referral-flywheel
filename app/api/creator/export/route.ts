// app/api/creator/export/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { format } from 'date-fns';

/**
 * GET /api/creator/export?creatorId={id}&type={members|commissions|all}
 * Export creator data to CSV format
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const creatorId = searchParams.get('creatorId');
    const exportType = searchParams.get('type') || 'all';

    if (!creatorId) {
      return NextResponse.json(
        { error: 'creatorId query parameter is required' },
        { status: 400 }
      );
    }

    // Verify creator exists
    const creator = await prisma.creator.findUnique({
      where: { id: creatorId },
      select: { id: true, companyName: true },
    });

    if (!creator) {
      return NextResponse.json(
        { error: 'Creator not found' },
        { status: 404 }
      );
    }

    let csvContent = '';
    const timestamp = format(new Date(), 'yyyy-MM-dd-HHmmss');

    switch (exportType) {
      case 'members':
        csvContent = await generateMembersCSV(creatorId);
        break;
      case 'commissions':
        csvContent = await generateCommissionsCSV(creatorId);
        break;
      case 'all':
      default:
        const membersCSV = await generateMembersCSV(creatorId);
        const commissionsCSV = await generateCommissionsCSV(creatorId);
        csvContent = `${membersCSV}\n\n${commissionsCSV}`;
        break;
    }

    console.log('✅ CSV export generated:', {
      creatorId,
      type: exportType,
      size: csvContent.length,
    });

    // Return CSV file
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${creator.companyName}-${exportType}-${timestamp}.csv"`,
      },
    });
  } catch (error) {
    console.error('❌ Error generating CSV export:', error);

    return NextResponse.json(
      {
        error: 'Failed to generate CSV export',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Generate CSV for all members in a creator's community
 */
async function generateMembersCSV(creatorId: string): Promise<string> {
  const members = await prisma.member.findMany({
    where: { creatorId },
    select: {
      username: true,
      email: true,
      referralCode: true,
      referredBy: true,
      lifetimeEarnings: true,
      monthlyEarnings: true,
      totalReferred: true,
      monthlyReferred: true,
      currentTier: true,
      createdAt: true,
      lastActive: true,
    },
    orderBy: { lifetimeEarnings: 'desc' },
  });

  // CSV Header
  const headers = [
    'Username',
    'Email',
    'Referral Code',
    'Referred By',
    'Lifetime Earnings',
    'Monthly Earnings',
    'Total Referred',
    'Monthly Referred',
    'Current Tier',
    'Join Date',
    'Last Active',
  ];

  // CSV Rows
  const rows = members.map((member) => [
    escapeCSV(member.username),
    escapeCSV(member.email),
    escapeCSV(member.referralCode),
    escapeCSV(member.referredBy || 'Organic'),
    `$${member.lifetimeEarnings.toFixed(2)}`,
    `$${member.monthlyEarnings.toFixed(2)}`,
    member.totalReferred.toString(),
    member.monthlyReferred.toString(),
    escapeCSV(member.currentTier),
    format(member.createdAt, 'yyyy-MM-dd'),
    member.lastActive ? format(member.lastActive, 'yyyy-MM-dd') : 'Never',
  ]);

  // Combine header + rows
  const csvLines = [headers.join(','), ...rows.map((row) => row.join(','))];

  return `MEMBERS REPORT\n${csvLines.join('\n')}`;
}

/**
 * Generate CSV for all commissions in a creator's community
 */
async function generateCommissionsCSV(creatorId: string): Promise<string> {
  const commissions = await prisma.commission.findMany({
    where: { creatorId },
    select: {
      whopPaymentId: true,
      saleAmount: true,
      memberShare: true,
      creatorShare: true,
      platformShare: true,
      paymentType: true,
      status: true,
      createdAt: true,
      paidAt: true,
      member: {
        select: {
          username: true,
          email: true,
          referralCode: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // CSV Header
  const headers = [
    'Payment ID',
    'Member Username',
    'Member Email',
    'Referral Code',
    'Sale Amount',
    'Member Share (10%)',
    'Creator Share (70%)',
    'Platform Share (20%)',
    'Payment Type',
    'Status',
    'Created Date',
    'Paid Date',
  ];

  // CSV Rows
  const rows = commissions.map((commission) => [
    escapeCSV(commission.whopPaymentId),
    escapeCSV(commission.member.username),
    escapeCSV(commission.member.email),
    escapeCSV(commission.member.referralCode),
    `$${commission.saleAmount.toFixed(2)}`,
    `$${commission.memberShare.toFixed(2)}`,
    `$${commission.creatorShare.toFixed(2)}`,
    `$${commission.platformShare.toFixed(2)}`,
    escapeCSV(commission.paymentType),
    escapeCSV(commission.status),
    format(commission.createdAt, 'yyyy-MM-dd HH:mm:ss'),
    commission.paidAt ? format(commission.paidAt, 'yyyy-MM-dd HH:mm:ss') : 'Pending',
  ]);

  // Combine header + rows
  const csvLines = [headers.join(','), ...rows.map((row) => row.join(','))];

  return `COMMISSIONS REPORT\n${csvLines.join('\n')}`;
}

/**
 * Escape CSV values (handle commas, quotes, newlines)
 */
function escapeCSV(value: string | null | undefined): string {
  if (!value) return '';

  // If value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}
