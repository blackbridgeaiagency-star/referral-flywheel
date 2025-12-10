// tests/unit/commission.test.ts
import { describe, it, expect } from '@jest/globals';
import { calculateCommission } from '@/lib/utils/commission';

describe('Commission Calculations', () => {
  describe('calculateCommission', () => {
    it('should correctly split commission 10/70/20', () => {
      const result = calculateCommission(100);

      expect(result.memberShare).toBe(10);
      expect(result.creatorShare).toBe(70);
      expect(result.platformShare).toBe(20);
      expect(result.total).toBe(100);
    });

    it('should handle decimal amounts correctly', () => {
      const result = calculateCommission(49.99);

      expect(result.memberShare).toBe(5.00); // Rounded to 2 decimals
      expect(result.creatorShare).toBe(34.99);
      expect(result.platformShare).toBe(10.00);
      expect(result.total).toBe(49.99);
    });

    it('should handle zero amount', () => {
      const result = calculateCommission(0);

      expect(result.memberShare).toBe(0);
      expect(result.creatorShare).toBe(0);
      expect(result.platformShare).toBe(0);
      expect(result.total).toBe(0);
    });

    it('should handle very large amounts', () => {
      const result = calculateCommission(1000000);

      expect(result.memberShare).toBe(100000);
      expect(result.creatorShare).toBe(700000);
      expect(result.platformShare).toBe(200000);
      expect(result.total).toBe(1000000);
    });

    it('should never lose cents due to rounding', () => {
      // Test various amounts that might cause rounding issues
      const testAmounts = [9.99, 19.99, 29.99, 39.99, 49.99, 99.99];

      testAmounts.forEach(amount => {
        const result = calculateCommission(amount);
        const sum = result.memberShare + result.creatorShare + result.platformShare;

        // The sum should equal the original amount (within floating point precision)
        expect(Math.abs(sum - amount)).toBeLessThan(0.01);
      });
    });
  });

  describe('Commission Edge Cases', () => {
    it('should throw error for negative amounts', () => {
      expect(() => calculateCommission(-100)).toThrow('Sale amount cannot be negative');
    });

    it('should throw error for NaN', () => {
      expect(() => calculateCommission(NaN)).toThrow('Sale amount must be a valid number');
    });

    it('should throw error for Infinity', () => {
      expect(() => calculateCommission(Infinity)).toThrow('Sale amount exceeds maximum allowed');
    });

    it('should throw error for amounts over $1,000,000', () => {
      expect(() => calculateCommission(1000001)).toThrow('Sale amount exceeds maximum allowed');
    });
  });

  describe('Lifetime Commission Verification', () => {
    it('should maintain 10% member rate across all payments', () => {
      const monthlyPayments = [49.99, 49.99, 49.99, 49.99, 49.99, 49.99];
      let totalMemberEarnings = 0;
      let totalSales = 0;

      monthlyPayments.forEach(payment => {
        const commission = calculateCommission(payment);
        totalMemberEarnings += commission.memberShare;
        totalSales += payment;
      });

      const actualRate = (totalMemberEarnings / totalSales) * 100;
      // Should be exactly 10% (within rounding tolerance)
      expect(Math.abs(actualRate - 10)).toBeLessThan(0.1);
    });

    it('should scale linearly with referral count', () => {
      const pricePerReferral = 49.99;
      const referralCounts = [1, 10, 100, 1000];

      referralCounts.forEach(count => {
        const monthlyRevenue = pricePerReferral * count;
        const commission = calculateCommission(monthlyRevenue);

        // Member should always get 10%
        const expectedMemberShare = monthlyRevenue * 0.10;
        expect(Math.abs(commission.memberShare - expectedMemberShare)).toBeLessThan(0.01);
      });
    });
  });
});