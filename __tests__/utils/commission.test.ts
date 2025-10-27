/**
 * Commission Calculation Tests
 */

import { calculateCommission } from '@/lib/utils/commission';

describe('Commission Calculation', () => {
  it('should calculate correct 10/70/20 split', () => {
    const result = calculateCommission(100);

    expect(result.memberShare).toBe(10);
    expect(result.creatorShare).toBe(70);
    expect(result.platformShare).toBe(20);
  });

  it('should handle decimal amounts correctly', () => {
    const result = calculateCommission(49.99);

    expect(result.memberShare).toBeCloseTo(4.999, 2);
    expect(result.creatorShare).toBeCloseTo(34.993, 2);
    expect(result.platformShare).toBeCloseTo(9.998, 2);
  });

  it('should sum to original amount', () => {
    const saleAmount = 123.45;
    const result = calculateCommission(saleAmount);

    const sum = result.memberShare + result.creatorShare + result.platformShare;
    expect(sum).toBeCloseTo(saleAmount, 2);
  });

  it('should handle zero amount', () => {
    const result = calculateCommission(0);

    expect(result.memberShare).toBe(0);
    expect(result.creatorShare).toBe(0);
    expect(result.platformShare).toBe(0);
  });

  it('should handle large amounts', () => {
    const result = calculateCommission(10000);

    expect(result.memberShare).toBe(1000);
    expect(result.creatorShare).toBe(7000);
    expect(result.platformShare).toBe(2000);
  });
});
