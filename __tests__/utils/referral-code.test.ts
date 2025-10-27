/**
 * Referral Code Generation Tests
 */

import { generateReferralCode, validateReferralCode } from '@/lib/utils/referral-code';

describe('Referral Code Utils', () => {
  describe('generateReferralCode', () => {
    it('should generate code with correct format FIRSTNAME-ABC123', () => {
      const code = generateReferralCode('John');
      expect(code).toMatch(/^[A-Z]+-[A-Z0-9]{6}$/);
    });

    it('should uppercase the name', () => {
      const code = generateReferralCode('john');
      expect(code.startsWith('JOHN-')).toBe(true);
    });

    it('should handle names with spaces', () => {
      const code = generateReferralCode('John Doe');
      expect(code.startsWith('JOHN-')).toBe(true);
    });

    it('should generate unique codes', () => {
      const code1 = generateReferralCode('John');
      const code2 = generateReferralCode('John');
      expect(code1).not.toBe(code2);
    });

    it('should handle special characters in names', () => {
      const code = generateReferralCode('José-María');
      expect(code).toMatch(/^[A-Z]+-[A-Z0-9]{6}$/);
    });
  });

  describe('validateReferralCode', () => {
    it('should validate correct format', () => {
      expect(validateReferralCode('JOHN-ABC123')).toBe(true);
      expect(validateReferralCode('MARY-XYZ789')).toBe(true);
    });

    it('should reject invalid formats', () => {
      expect(validateReferralCode('invalid')).toBe(false);
      expect(validateReferralCode('JOHN-AB')).toBe(false);
      expect(validateReferralCode('john-abc123')).toBe(false);
      expect(validateReferralCode('')).toBe(false);
    });
  });
});
