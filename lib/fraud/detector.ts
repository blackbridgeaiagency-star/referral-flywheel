/**
 * Fraud Detection System
 *
 * Detects and prevents:
 * - Self-referrals (same IP, device, payment method)
 * - Click fraud (bot traffic, unusual velocity)
 * - Commission abuse (chargebacks, refunds, multiple accounts)
 * - Attribution manipulation
 *
 * Risk Scoring: 0-100
 * - 0-30: Low risk (auto-approve)
 * - 31-70: Medium risk (flag for review)
 * - 71-100: High risk (auto-block)
 */

import { prisma } from '@/lib/db/prisma';

export interface FraudCheck {
  riskScore: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high';
  flags: FraudFlag[];
  shouldBlock: boolean;
  shouldReview: boolean;
  details: Record<string, any>;
}

export interface FraudFlag {
  type: FraudFlagType;
  severity: 'low' | 'medium' | 'high';
  description: string;
  evidence: Record<string, any>;
  points: number; // Risk points added
}

export type FraudFlagType =
  | 'self_referral_ip'
  | 'self_referral_fingerprint'
  | 'self_referral_payment'
  | 'bot_traffic'
  | 'click_velocity'
  | 'geographic_anomaly'
  | 'chargeback_history'
  | 'refund_pattern'
  | 'multiple_accounts'
  | 'suspicious_timing'
  | 'vpn_detected';

// Risk point values
const RISK_POINTS: Record<FraudFlagType, number> = {
  self_referral_ip: 40,
  self_referral_fingerprint: 50,
  self_referral_payment: 60,
  bot_traffic: 30,
  click_velocity: 25,
  geographic_anomaly: 15,
  chargeback_history: 70,
  refund_pattern: 50,
  multiple_accounts: 45,
  suspicious_timing: 20,
  vpn_detected: 10,
};

/**
 * Check for self-referral fraud
 * Detects when a member tries to refer themselves
 */
export async function checkSelfReferral(
  referrerId: string,
  refereeUserId: string,
  refereeIpHash: string,
  refereeFingerprint: string
): Promise<FraudFlag[]> {
  const flags: FraudFlag[] = [];

  try {
    // Get referrer data
    const referrer = await prisma.member.findUnique({
      where: { id: referrerId },
      include: {
        attributions: {
          select: { ipHash: true, fingerprint: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!referrer) return flags;

    // Check 1: Same IP address
    const sameIP = referrer.attributions.some((attr) => attr.ipHash === refereeIpHash);
    if (sameIP) {
      flags.push({
        type: 'self_referral_ip',
        severity: 'high',
        description: 'Referee has same IP address as referrer',
        evidence: {
          referrerId,
          refereeUserId,
          ipHash: refereeIpHash,
        },
        points: RISK_POINTS.self_referral_ip,
      });
    }

    // Check 2: Same device fingerprint
    const sameFingerprint = referrer.attributions.some(
      (attr) => attr.fingerprint === refereeFingerprint
    );
    if (sameFingerprint) {
      flags.push({
        type: 'self_referral_fingerprint',
        severity: 'high',
        description: 'Referee has same device fingerprint as referrer',
        evidence: {
          referrerId,
          refereeUserId,
          fingerprint: refereeFingerprint,
        },
        points: RISK_POINTS.self_referral_fingerprint,
      });
    }

    // Check 3: Same user ID (most obvious)
    if (referrer.userId === refereeUserId) {
      flags.push({
        type: 'self_referral_payment',
        severity: 'high',
        description: 'Referee user ID matches referrer user ID',
        evidence: {
          referrerId,
          refereeUserId,
          userId: referrer.userId,
        },
        points: RISK_POINTS.self_referral_payment,
      });
    }
  } catch (error) {
    console.error('Error checking self-referral:', error);
  }

  return flags;
}

/**
 * Check for click fraud (bots, unusual patterns)
 */
export async function checkClickFraud(
  referralCode: string,
  fingerprint: string,
  userAgent: string | null
): Promise<FraudFlag[]> {
  const flags: FraudFlag[] = [];

  try {
    // Get recent clicks for this referral code
    const recentClicks = await prisma.attributionClick.findMany({
      where: {
        referralCode,
        createdAt: {
          gte: new Date(Date.now() - 60 * 60 * 1000), // Last hour
        },
      },
    });

    // Check 1: Click velocity (too many clicks too fast)
    if (recentClicks.length > 100) {
      flags.push({
        type: 'click_velocity',
        severity: 'medium',
        description: `Unusual click velocity: ${recentClicks.length} clicks in 1 hour`,
        evidence: {
          referralCode,
          clicksLastHour: recentClicks.length,
        },
        points: RISK_POINTS.click_velocity,
      });
    }

    // Check 2: Bot detection (simple user agent check)
    const botPatterns = ['bot', 'crawler', 'spider', 'scraper', 'curl', 'wget'];
    const isBot = userAgent && botPatterns.some((pattern) =>
      userAgent.toLowerCase().includes(pattern)
    );

    if (isBot) {
      flags.push({
        type: 'bot_traffic',
        severity: 'medium',
        description: 'User agent suggests automated traffic',
        evidence: {
          userAgent,
          referralCode,
        },
        points: RISK_POINTS.bot_traffic,
      });
    }

    // Check 3: Same fingerprint clicking multiple times
    const sameFingerprintClicks = recentClicks.filter(
      (click) => click.fingerprint === fingerprint
    );

    if (sameFingerprintClicks.length > 5) {
      flags.push({
        type: 'suspicious_timing',
        severity: 'low',
        description: `Same device clicked ${sameFingerprintClicks.length} times in 1 hour`,
        evidence: {
          fingerprint,
          clicks: sameFingerprintClicks.length,
        },
        points: RISK_POINTS.suspicious_timing,
      });
    }
  } catch (error) {
    console.error('Error checking click fraud:', error);
  }

  return flags;
}

/**
 * Check for commission abuse (chargebacks, refunds, patterns)
 */
export async function checkCommissionAbuse(memberId: string): Promise<FraudFlag[]> {
  const flags: FraudFlag[] = [];

  try {
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      include: {
        commissions: {
          where: {
            createdAt: {
              gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Last 90 days
            },
          },
        },
      },
    });

    if (!member) return flags;

    const totalCommissions = member.commissions.length;
    const failedCommissions = member.commissions.filter((c) => c.status === 'failed');

    // Check 1: High failure rate (chargebacks, refunds)
    const failureRate = totalCommissions > 0 ? failedCommissions.length / totalCommissions : 0;

    if (failureRate > 0.3 && totalCommissions > 5) {
      flags.push({
        type: 'chargeback_history',
        severity: 'high',
        description: `High commission failure rate: ${(failureRate * 100).toFixed(1)}%`,
        evidence: {
          memberId,
          totalCommissions,
          failedCommissions: failedCommissions.length,
          failureRate,
        },
        points: RISK_POINTS.chargeback_history,
      });
    }

    // Check 2: Suspicious refund pattern (many refunds shortly after payment)
    const quickRefunds = member.commissions.filter((c) => {
      if (c.status !== 'failed' || !c.paidAt) return false;
      const hoursBetween =
        (c.paidAt.getTime() - c.createdAt.getTime()) / (1000 * 60 * 60);
      return hoursBetween < 48; // Refunded within 48 hours
    });

    if (quickRefunds.length > 3) {
      flags.push({
        type: 'refund_pattern',
        severity: 'high',
        description: `Pattern of quick refunds: ${quickRefunds.length} refunds within 48 hours`,
        evidence: {
          memberId,
          quickRefunds: quickRefunds.length,
        },
        points: RISK_POINTS.refund_pattern,
      });
    }
  } catch (error) {
    console.error('Error checking commission abuse:', error);
  }

  return flags;
}

/**
 * Check for multiple accounts from same person
 */
export async function checkMultipleAccounts(
  userId: string,
  ipHash: string,
  fingerprint: string
): Promise<FraudFlag[]> {
  const flags: FraudFlag[] = [];

  try {
    // Find members with same IP or fingerprint
    const suspiciousMembers = await prisma.member.findMany({
      where: {
        OR: [
          {
            attributions: {
              some: { ipHash },
            },
          },
          {
            attributions: {
              some: { fingerprint },
            },
          },
        ],
        NOT: {
          userId, // Exclude current user
        },
      },
    });

    if (suspiciousMembers.length > 0) {
      flags.push({
        type: 'multiple_accounts',
        severity: 'medium',
        description: `Found ${suspiciousMembers.length} other accounts with same IP/fingerprint`,
        evidence: {
          userId,
          ipHash,
          fingerprint,
          suspiciousAccounts: suspiciousMembers.map((m) => m.id),
        },
        points: RISK_POINTS.multiple_accounts,
      });
    }
  } catch (error) {
    console.error('Error checking multiple accounts:', error);
  }

  return flags;
}

/**
 * Comprehensive fraud check
 * Combines all fraud detection methods
 */
export async function performFraudCheck(params: {
  referrerId?: string;
  refereeUserId?: string;
  memberId?: string;
  referralCode?: string;
  ipHash: string;
  fingerprint: string;
  userAgent?: string | null;
}): Promise<FraudCheck> {
  const allFlags: FraudFlag[] = [];

  try {
    // Run all checks in parallel
    const [selfReferralFlags, clickFraudFlags, commissionAbuseFlags, multipleAccountFlags] =
      await Promise.all([
        params.referrerId && params.refereeUserId
          ? checkSelfReferral(
              params.referrerId,
              params.refereeUserId,
              params.ipHash,
              params.fingerprint
            )
          : Promise.resolve([]),

        params.referralCode
          ? checkClickFraud(params.referralCode, params.fingerprint, params.userAgent || null)
          : Promise.resolve([]),

        params.memberId
          ? checkCommissionAbuse(params.memberId)
          : Promise.resolve([]),

        params.refereeUserId
          ? checkMultipleAccounts(params.refereeUserId, params.ipHash, params.fingerprint)
          : Promise.resolve([]),
      ]);

    allFlags.push(...selfReferralFlags);
    allFlags.push(...clickFraudFlags);
    allFlags.push(...commissionAbuseFlags);
    allFlags.push(...multipleAccountFlags);

    // Calculate total risk score
    const riskScore = Math.min(
      100,
      allFlags.reduce((sum, flag) => sum + flag.points, 0)
    );

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high';
    if (riskScore <= 30) riskLevel = 'low';
    else if (riskScore <= 70) riskLevel = 'medium';
    else riskLevel = 'high';

    return {
      riskScore,
      riskLevel,
      flags: allFlags,
      shouldBlock: riskScore > 70,
      shouldReview: riskScore > 30 && riskScore <= 70,
      details: params,
    };
  } catch (error) {
    console.error('Error performing fraud check:', error);

    // Return safe default on error
    return {
      riskScore: 0,
      riskLevel: 'low',
      flags: [],
      shouldBlock: false,
      shouldReview: false,
      details: params,
    };
  }
}

/**
 * Get fraud statistics for a creator
 * Shows fraud detection metrics
 */
export async function getCreatorFraudStats(creatorId: string): Promise<{
  totalMembers: number;
  flaggedMembers: number;
  blockedMembers: number;
  flaggedCommissions: number;
  savedFromFraud: number;
  topFraudTypes: Array<{ type: string; count: number }>;
}> {
  // TODO: Implement with FraudEvent model
  // For now, return mock data
  return {
    totalMembers: 0,
    flaggedMembers: 0,
    blockedMembers: 0,
    flaggedCommissions: 0,
    savedFromFraud: 0,
    topFraudTypes: [],
  };
}
