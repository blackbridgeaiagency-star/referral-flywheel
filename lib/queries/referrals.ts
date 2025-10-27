// lib/queries/referrals.ts
import { prisma } from '@/lib/db/prisma';
import { startOfMonth } from 'date-fns';

/**
 * Get accurate monthly referral counts based on commission timestamps
 * (not member creation dates)
 */
export async function getMonthlyReferralStats(memberId: string) {
  const monthStart = startOfMonth(new Date());

  // Count conversions this month based on when commissions were created
  const monthlyConversions = await prisma.commission.count({
    where: {
      memberId,
      status: 'paid',
      paymentType: 'initial',  // Only count initial payments as new referrals
      createdAt: {
        gte: monthStart
      }
    }
  });

  // Count total conversions (all-time) based on initial commissions
  const totalConversions = await prisma.commission.count({
    where: {
      memberId,
      status: 'paid',
      paymentType: 'initial'
    }
  });

  return {
    monthlyReferred: monthlyConversions,
    totalReferred: totalConversions
  };
}

/**
 * Get referrals with their actual conversion dates from commission records
 */
export async function getReferralList(memberId: string, limit: number = 10) {
  // Get referrals with their first commission (conversion) date
  const referrals = await prisma.member.findMany({
    where: {
      referredBy: {
        in: await prisma.member.findUnique({
          where: { id: memberId },
          select: { referralCode: true }
        }).then(m => m?.referralCode ? [m.referralCode] : [])
      }
    },
    select: {
      id: true,
      username: true,
      createdAt: true,
      commissions: {
        where: {
          paymentType: 'initial',
          status: 'paid'
        },
        select: {
          createdAt: true
        },
        orderBy: {
          createdAt: 'asc'
        },
        take: 1  // Get first commission (conversion date)
      }
    },
    where: {
      commissions: {
        some: {
          paymentType: 'initial',
          status: 'paid'
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: limit
  });

  return referrals.map(referral => ({
    id: referral.id,
    username: referral.username,
    signupDate: referral.createdAt,
    conversionDate: referral.commissions[0]?.createdAt || referral.createdAt
  }));
}

/**
 * Get monthly growth data based on commission timestamps
 */
export async function getMonthlyGrowth(memberId: string, months: number = 6) {
  const monthsAgo = new Date();
  monthsAgo.setMonth(monthsAgo.getMonth() - months);

  // Get commissions grouped by month
  const commissions = await prisma.commission.groupBy({
    by: ['createdAt'],
    where: {
      memberId,
      status: 'paid',
      paymentType: 'initial',
      createdAt: {
        gte: monthsAgo
      }
    },
    _count: true
  });

  // Group by month
  const monthlyData = new Map<string, number>();

  commissions.forEach(commission => {
    const monthKey = `${commission.createdAt.getFullYear()}-${String(commission.createdAt.getMonth() + 1).padStart(2, '0')}`;
    monthlyData.set(monthKey, (monthlyData.get(monthKey) || 0) + commission._count);
  });

  return Array.from(monthlyData.entries()).map(([month, count]) => ({
    month,
    conversions: count
  }));
}
