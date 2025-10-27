// lib/security/fraud-detection.ts
import { prisma } from '@/lib/db/prisma';
import { cache } from '@/lib/cache/redis';

/**
 * Fraud risk scoring system
 */
export enum FraudRiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

/**
 * Fraud detection rules and patterns
 */
export interface FraudPattern {
  id: string;
  name: string;
  description: string;
  weight: number; // How much this pattern contributes to risk score
  check: (data: any) => Promise<boolean>;
}

/**
 * Fraud detection results
 */
export interface FraudDetectionResult {
  riskLevel: FraudRiskLevel;
  riskScore: number; // 0-100
  triggeredPatterns: string[];
  recommendations: string[];
  shouldBlock: boolean;
  requiresReview: boolean;
  metadata: Record<string, any>;
}

/**
 * Core fraud detection engine
 */
export class FraudDetector {
  private patterns: Map<string, FraudPattern> = new Map();

  constructor() {
    this.registerPatterns();
  }

  /**
   * Register all fraud detection patterns
   */
  private registerPatterns() {
    // Pattern 1: Rapid referral velocity
    this.addPattern({
      id: 'rapid_velocity',
      name: 'Rapid Referral Velocity',
      description: 'Too many referrals in a short time period',
      weight: 30,
      check: async (data: { memberId: string }) => {
        const recentReferrals = await prisma.member.count({
          where: {
            referredBy: data.memberId,
            createdAt: {
              gte: new Date(Date.now() - 60 * 60 * 1000), // Last hour
            },
          },
        });
        return recentReferrals > 10; // More than 10 referrals per hour
      },
    });

    // Pattern 2: Same IP multiple accounts
    this.addPattern({
      id: 'same_ip_accounts',
      name: 'Multiple Accounts Same IP',
      description: 'Multiple accounts created from the same IP address',
      weight: 40,
      check: async (data: { ipAddress: string }) => {
        if (!data.ipAddress) return false;

        const recentAccounts = await prisma.attributionClick.count({
          where: {
            ipAddress: data.ipAddress,
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            },
            converted: true,
          },
        });
        return recentAccounts > 5; // More than 5 accounts per IP per day
      },
    });

    // Pattern 3: Similar email patterns
    this.addPattern({
      id: 'email_pattern',
      name: 'Suspicious Email Pattern',
      description: 'Multiple accounts with similar email patterns',
      weight: 25,
      check: async (data: { email: string; memberId: string }) => {
        if (!data.email) return false;

        // Extract base email (before + and numbers)
        const baseEmail = data.email.split('@')[0].replace(/[0-9]+/g, '').replace(/\+.*/, '');
        const domain = data.email.split('@')[1];

        const similarEmails = await prisma.member.count({
          where: {
            email: {
              contains: baseEmail,
              endsWith: domain,
            },
            id: { not: data.memberId },
          },
        });

        return similarEmails > 3; // More than 3 similar emails
      },
    });

    // Pattern 4: Suspicious payment patterns
    this.addPattern({
      id: 'payment_pattern',
      name: 'Suspicious Payment Pattern',
      description: 'Unusual payment amounts or frequencies',
      weight: 35,
      check: async (data: { memberId: string }) => {
        const recentCommissions = await prisma.commission.findMany({
          where: {
            memberId: data.memberId,
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last week
            },
          },
          select: {
            saleAmount: true,
            createdAt: true,
          },
        });

        // Check for identical amounts (potential self-referral)
        const amounts = recentCommissions.map(c => c.saleAmount);
        const duplicateAmounts = amounts.filter((amt, i) => amounts.indexOf(amt) !== i);

        return duplicateAmounts.length > 2; // More than 2 duplicate amounts
      },
    });

    // Pattern 5: Device fingerprint matching
    this.addPattern({
      id: 'device_fingerprint',
      name: 'Same Device Multiple Accounts',
      description: 'Multiple accounts from the same device',
      weight: 45,
      check: async (data: { fingerprint: string }) => {
        if (!data.fingerprint) return false;

        const matchingDevices = await prisma.attributionClick.count({
          where: {
            fingerprint: data.fingerprint,
            converted: true,
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
            },
          },
        });

        return matchingDevices > 3; // More than 3 accounts per device
      },
    });

    // Pattern 6: Geolocation anomaly
    this.addPattern({
      id: 'geo_anomaly',
      name: 'Geolocation Anomaly',
      description: 'Referrals from unusual geographic patterns',
      weight: 20,
      check: async (data: { memberId: string; country?: string }) => {
        if (!data.country) return false;

        // Check if member's referrals are from very different locations
        const referrals = await prisma.member.findMany({
          where: { referredBy: data.memberId },
          select: { id: true },
        });

        if (referrals.length < 5) return false;

        // Get click data for referrals
        const clicks = await prisma.attributionClick.findMany({
          where: {
            memberId: { in: referrals.map(r => r.id) },
            converted: true,
          },
          select: { ipAddress: true },
        });

        // In production, you'd use an IP geolocation service here
        // For now, we'll check if all IPs are suspiciously similar
        const uniqueIPs = new Set(clicks.map(c => c.ipAddress?.split('.').slice(0, 3).join('.')));

        return uniqueIPs.size === 1 && clicks.length > 5; // All from same subnet
      },
    });

    // Pattern 7: Time pattern anomaly
    this.addPattern({
      id: 'time_anomaly',
      name: 'Suspicious Time Pattern',
      description: 'Referrals at suspicious times',
      weight: 15,
      check: async (data: { memberId: string }) => {
        const referrals = await prisma.member.findMany({
          where: {
            referredBy: data.memberId,
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
          select: { createdAt: true },
        });

        if (referrals.length < 5) return false;

        // Check if all referrals are within same hour of day
        const hours = referrals.map(r => r.createdAt.getHours());
        const uniqueHours = new Set(hours);

        return uniqueHours.size <= 2 && referrals.length > 5; // All in 2-hour window
      },
    });

    // Pattern 8: Chargeback history
    this.addPattern({
      id: 'chargeback_history',
      name: 'Chargeback History',
      description: 'Member has history of chargebacks',
      weight: 50,
      check: async (data: { memberId: string }) => {
        const chargebacks = await prisma.commission.count({
          where: {
            memberId: data.memberId,
            status: 'refunded',
          },
        });

        return chargebacks > 2; // More than 2 chargebacks
      },
    });
  }

  /**
   * Add a fraud pattern
   */
  private addPattern(pattern: FraudPattern) {
    this.patterns.set(pattern.id, pattern);
  }

  /**
   * Analyze member for fraud risk
   */
  async analyzeMember(memberId: string, additionalData?: any): Promise<FraudDetectionResult> {
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: {
        id: true,
        email: true,
        createdAt: true,
        totalReferred: true,
        lifetimeEarnings: true,
      },
    });

    if (!member) {
      throw new Error('Member not found');
    }

    const data = {
      memberId,
      email: member.email,
      ...additionalData,
    };

    return this.analyze(data);
  }

  /**
   * Core analysis function
   */
  async analyze(data: any): Promise<FraudDetectionResult> {
    const cacheKey = `fraud:analysis:${JSON.stringify(data)}`;

    // Check cache first
    const cached = await cache.get<FraudDetectionResult>(cacheKey);
    if (cached) {
      return cached;
    }

    let riskScore = 0;
    const triggeredPatterns: string[] = [];
    const recommendations: string[] = [];

    // Run all patterns in parallel
    const patternChecks = await Promise.all(
      Array.from(this.patterns.values()).map(async (pattern) => {
        try {
          const triggered = await pattern.check(data);
          return { pattern, triggered };
        } catch (error) {
          console.error(`Error checking pattern ${pattern.id}:`, error);
          return { pattern, triggered: false };
        }
      })
    );

    // Calculate risk score
    for (const { pattern, triggered } of patternChecks) {
      if (triggered) {
        riskScore += pattern.weight;
        triggeredPatterns.push(pattern.name);
      }
    }

    // Determine risk level
    let riskLevel: FraudRiskLevel;
    let shouldBlock = false;
    let requiresReview = false;

    if (riskScore >= 80) {
      riskLevel = FraudRiskLevel.CRITICAL;
      shouldBlock = true;
      requiresReview = true;
      recommendations.push('Block immediately and investigate');
    } else if (riskScore >= 60) {
      riskLevel = FraudRiskLevel.HIGH;
      shouldBlock = false;
      requiresReview = true;
      recommendations.push('Flag for manual review');
      recommendations.push('Limit commission payouts pending review');
    } else if (riskScore >= 40) {
      riskLevel = FraudRiskLevel.MEDIUM;
      requiresReview = true;
      recommendations.push('Monitor closely');
      recommendations.push('Request additional verification');
    } else {
      riskLevel = FraudRiskLevel.LOW;
      recommendations.push('Continue normal operations');
    }

    // Add specific recommendations based on patterns
    if (triggeredPatterns.includes('Same Device Multiple Accounts')) {
      recommendations.push('Implement device limit per user');
    }
    if (triggeredPatterns.includes('Suspicious Payment Pattern')) {
      recommendations.push('Review payment history manually');
    }
    if (triggeredPatterns.includes('Rapid Referral Velocity')) {
      recommendations.push('Implement rate limiting');
    }

    const result: FraudDetectionResult = {
      riskLevel,
      riskScore: Math.min(100, riskScore),
      triggeredPatterns,
      recommendations,
      shouldBlock,
      requiresReview,
      metadata: {
        analyzedAt: new Date().toISOString(),
        dataPoints: Object.keys(data).length,
      },
    };

    // Cache result for 5 minutes
    await cache.set(cacheKey, result, 300);

    // Log high-risk detections
    if (riskLevel === FraudRiskLevel.HIGH || riskLevel === FraudRiskLevel.CRITICAL) {
      await this.logFraudDetection(data, result);
    }

    return result;
  }

  /**
   * Log fraud detection for audit trail
   */
  private async logFraudDetection(data: any, result: FraudDetectionResult) {
    // In production, this would log to a dedicated fraud table or external service
    console.log('🚨 FRAUD DETECTION:', {
      data,
      result,
      timestamp: new Date().toISOString(),
    });

    // You could also send alerts here
    if (result.riskLevel === FraudRiskLevel.CRITICAL) {
      // Send immediate alert to admins
      console.error('‼️ CRITICAL FRAUD RISK DETECTED');
    }
  }

  /**
   * Bulk analysis for batch processing
   */
  async analyzeBatch(memberIds: string[]): Promise<Map<string, FraudDetectionResult>> {
    const results = new Map<string, FraudDetectionResult>();

    // Process in chunks to avoid overwhelming the system
    const chunkSize = 10;
    for (let i = 0; i < memberIds.length; i += chunkSize) {
      const chunk = memberIds.slice(i, i + chunkSize);

      const chunkResults = await Promise.all(
        chunk.map(async (memberId) => {
          try {
            const result = await this.analyzeMember(memberId);
            return { memberId, result };
          } catch (error) {
            console.error(`Error analyzing member ${memberId}:`, error);
            return null;
          }
        })
      );

      for (const item of chunkResults) {
        if (item) {
          results.set(item.memberId, item.result);
        }
      }
    }

    return results;
  }

  /**
   * Real-time fraud check for new referrals
   */
  async checkNewReferral(
    referrerId: string,
    referredEmail: string,
    ipAddress?: string,
    fingerprint?: string
  ): Promise<FraudDetectionResult> {
    return this.analyze({
      memberId: referrerId,
      email: referredEmail,
      ipAddress,
      fingerprint,
      checkType: 'new_referral',
    });
  }

  /**
   * Check commission before payout
   */
  async checkCommissionPayout(commissionId: string): Promise<FraudDetectionResult> {
    const commission = await prisma.commission.findUnique({
      where: { id: commissionId },
      include: {
        member: true,
        referredMember: true,
      },
    });

    if (!commission) {
      throw new Error('Commission not found');
    }

    return this.analyze({
      memberId: commission.memberId,
      commissionId,
      amount: commission.saleAmount,
      referredMemberId: commission.referredMemberId,
      checkType: 'commission_payout',
    });
  }
}

// Export singleton instance
export const fraudDetector = new FraudDetector();

/**
 * Middleware for fraud checking
 */
export async function fraudCheckMiddleware(
  req: any,
  res: any,
  next: any
) {
  try {
    const { memberId } = req.body || req.query;

    if (memberId) {
      const result = await fraudDetector.analyzeMember(memberId);

      if (result.shouldBlock) {
        return res.status(403).json({
          error: 'Request blocked due to suspicious activity',
          riskLevel: result.riskLevel,
        });
      }

      // Attach fraud check result to request
      req.fraudCheck = result;
    }

    next();
  } catch (error) {
    console.error('Fraud check middleware error:', error);
    next(); // Don't block on error
  }
}

/**
 * Scheduled fraud scanning job
 */
export async function runFraudScan() {
  console.log('🔍 Running scheduled fraud scan...');

  try {
    // Get recently active members
    const recentMembers = await prisma.member.findMany({
      where: {
        lastActive: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
      select: { id: true },
    });

    const memberIds = recentMembers.map(m => m.id);
    const results = await fraudDetector.analyzeBatch(memberIds);

    // Count risk levels
    const summary = {
      total: results.size,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    for (const result of results.values()) {
      switch (result.riskLevel) {
        case FraudRiskLevel.CRITICAL:
          summary.critical++;
          break;
        case FraudRiskLevel.HIGH:
          summary.high++;
          break;
        case FraudRiskLevel.MEDIUM:
          summary.medium++;
          break;
        case FraudRiskLevel.LOW:
          summary.low++;
          break;
      }
    }

    console.log('✅ Fraud scan completed:', summary);
    return summary;
  } catch (error) {
    console.error('❌ Fraud scan failed:', error);
    throw error;
  }
}