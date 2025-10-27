import { prisma } from '@/lib/db/prisma';
import { subDays, subMonths, format, startOfMonth, endOfMonth } from 'date-fns';

export async function getMemberEarnings(memberId: string, days: number = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);

  // Get commissions for the member within the date range
  const commissions = await prisma.commission.findMany({
    where: {
      memberId,
      createdAt: {
        gte: startDate,
        lte: endDate
      },
      status: 'paid'
    },
    select: {
      memberShare: true,
      createdAt: true
    },
    orderBy: {
      createdAt: 'asc'
    }
  });

  // Group by date and sum earnings
  const earningsByDate = new Map<string, { earnings: number; count: number }>();

  // Initialize all dates in range with 0 earnings
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateKey = date.toISOString().split('T')[0];
    earningsByDate.set(dateKey, { earnings: 0, count: 0 });
  }

  // Add actual earnings
  commissions.forEach(commission => {
    const dateKey = commission.createdAt.toISOString().split('T')[0];
    const existing = earningsByDate.get(dateKey) || { earnings: 0, count: 0 };
    earningsByDate.set(dateKey, {
      earnings: existing.earnings + commission.memberShare,
      count: existing.count + 1
    });
  });

  // Convert to array and sort by date
  return Array.from(earningsByDate.entries())
    .map(([date, data]) => ({
      date,
      earnings: data.earnings,
      count: data.count
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export async function getMemberEarningsByDateRange(
  memberId: string,
  startDate: Date,
  endDate: Date
) {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  // Get commissions for the member within the date range
  const commissions = await prisma.commission.findMany({
    where: {
      memberId,
      createdAt: {
        gte: start,
        lte: end
      },
      status: 'paid'
    },
    select: {
      memberShare: true,
      createdAt: true
    },
    orderBy: {
      createdAt: 'asc'
    }
  });

  // Group by date and sum earnings
  const earningsByDate = new Map<string, { earnings: number; count: number }>();

  // Initialize all dates in range with 0 earnings
  const currentDate = new Date(start);
  while (currentDate <= end) {
    const dateKey = currentDate.toISOString().split('T')[0];
    earningsByDate.set(dateKey, { earnings: 0, count: 0 });
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Add actual earnings
  commissions.forEach(commission => {
    const dateKey = commission.createdAt.toISOString().split('T')[0];
    const existing = earningsByDate.get(dateKey) || { earnings: 0, count: 0 };
    earningsByDate.set(dateKey, {
      earnings: existing.earnings + commission.memberShare,
      count: existing.count + 1
    });
  });

  // Convert to array and sort by date
  return Array.from(earningsByDate.entries())
    .map(([date, data]) => ({
      date,
      earnings: data.earnings,
      count: data.count
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

/**
 * Get member earnings with smart time range support
 * @param memberId - Member ID
 * @param range - Time range: '7' | '30' | '90' | 'year' | 'custom'
 * @param customStart - Custom start date (for 'custom' range)
 * @param customEnd - Custom end date (for 'custom' range)
 * @returns Earnings data aggregated by day (7/30/90/custom) or month (year)
 */
export async function getMemberEarningsByRange(
  memberId: string,
  range: '7' | '30' | '90' | 'year' | 'custom' = '30',
  customStart?: Date,
  customEnd?: Date
) {
  let startDate: Date;
  let endDate: Date = new Date();
  let aggregateByMonth = false;

  // Calculate date range based on selection
  switch (range) {
    case '7':
      startDate = subDays(new Date(), 7);
      break;
    case '30':
      startDate = subDays(new Date(), 30);
      break;
    case '90':
      startDate = subDays(new Date(), 90);
      break;
    case 'year':
      startDate = subMonths(new Date(), 12);
      aggregateByMonth = true;
      break;
    case 'custom':
      if (!customStart || !customEnd) {
        throw new Error('Custom range requires start and end dates');
      }
      startDate = customStart;
      endDate = customEnd;
      break;
    default:
      startDate = subDays(new Date(), 30);
  }

  // Set time boundaries
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  // Fetch commissions
  const commissions = await prisma.commission.findMany({
    where: {
      memberId,
      createdAt: {
        gte: startDate,
        lte: endDate
      },
      status: 'paid'
    },
    select: {
      memberShare: true,
      createdAt: true
    },
    orderBy: {
      createdAt: 'asc'
    }
  });

  if (aggregateByMonth) {
    // Aggregate by month for year view
    const earningsByMonth = new Map<string, { earnings: number; count: number }>();

    // Initialize all months in range
    const currentMonth = new Date(startDate);
    while (currentMonth <= endDate) {
      const monthKey = format(startOfMonth(currentMonth), 'yyyy-MM');
      earningsByMonth.set(monthKey, { earnings: 0, count: 0 });
      currentMonth.setMonth(currentMonth.getMonth() + 1);
    }

    // Add actual earnings
    commissions.forEach(commission => {
      const monthKey = format(startOfMonth(commission.createdAt), 'yyyy-MM');
      const existing = earningsByMonth.get(monthKey) || { earnings: 0, count: 0 };
      earningsByMonth.set(monthKey, {
        earnings: existing.earnings + commission.memberShare,
        count: existing.count + 1
      });
    });

    // Convert to array and sort
    return Array.from(earningsByMonth.entries())
      .map(([month, data]) => ({
        date: `${month}-01`, // Use first day of month for consistency
        earnings: data.earnings,
        count: data.count
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  } else {
    // Aggregate by day
    const earningsByDate = new Map<string, { earnings: number; count: number }>();

    // Initialize all dates in range
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateKey = currentDate.toISOString().split('T')[0];
      earningsByDate.set(dateKey, { earnings: 0, count: 0 });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Add actual earnings
    commissions.forEach(commission => {
      const dateKey = commission.createdAt.toISOString().split('T')[0];
      const existing = earningsByDate.get(dateKey) || { earnings: 0, count: 0 };
      earningsByDate.set(dateKey, {
        earnings: existing.earnings + commission.memberShare,
        count: existing.count + 1
      });
    });

    // Convert to array and sort
    return Array.from(earningsByDate.entries())
      .map(([date, data]) => ({
        date,
        earnings: data.earnings,
        count: data.count
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }
}