// tests/unit/referral-code.test.ts
import { describe, it, expect } from '@jest/globals';
import { generateReferralCode } from '@/lib/utils/referral-code';

describe('Referral Code Generation', () => {
  describe('generateReferralCode', () => {
    it('should generate code in format FIRSTNAME-XXXXXX', () => {
      const code = generateReferralCode('john');

      expect(code).toMatch(/^JOHN-[A-Z0-9]{6}$/);
    });

    it('should handle names with spaces', () => {
      const code = generateReferralCode('John Doe');

      expect(code).toMatch(/^JOHN-[A-Z0-9]{6}$/);
    });

    it('should handle email addresses', () => {
      const code = generateReferralCode('john.doe@example.com');

      expect(code).toMatch(/^JOHN-[A-Z0-9]{6}$/);
    });

    it('should handle special characters', () => {
      const code = generateReferralCode('joão-smith_123');

      expect(code).toMatch(/^JOO-[A-Z0-9]{6}$/);
    });

    it('should handle empty string', () => {
      const code = generateReferralCode('');

      expect(code).toMatch(/^USER-[A-Z0-9]{6}$/);
    });

    it('should handle null/undefined', () => {
      const code1 = generateReferralCode(null as any);
      const code2 = generateReferralCode(undefined as any);

      expect(code1).toMatch(/^USER-[A-Z0-9]{6}$/);
      expect(code2).toMatch(/^USER-[A-Z0-9]{6}$/);
    });

    it('should handle very long names', () => {
      const longName = 'a'.repeat(100);
      const code = generateReferralCode(longName);

      // Should truncate to reasonable length
      expect(code.length).toBeLessThan(30);
      expect(code).toMatch(/^[A-Z]+-[A-Z0-9]{6}$/);
    });

    it('should handle numbers only', () => {
      const code = generateReferralCode('12345');

      expect(code).toMatch(/^12345-[A-Z0-9]{6}$/);
    });

    it('should handle unicode characters', () => {
      const code = generateReferralCode('北京');

      expect(code).toMatch(/^[A-Z0-9]+-[A-Z0-9]{6}$/);
    });

    it('should always generate unique codes', () => {
      const codes = new Set();

      // Generate 1000 codes with same name
      for (let i = 0; i < 1000; i++) {
        codes.add(generateReferralCode('john'));
      }

      // All should be unique
      expect(codes.size).toBe(1000);
    });
  });

  describe('Code Format Consistency', () => {
    it('should always be uppercase', () => {
      const testNames = ['john', 'JOHN', 'JoHn', 'jOhN'];

      testNames.forEach(name => {
        const code = generateReferralCode(name);
        expect(code).toBe(code.toUpperCase());
      });
    });

    it('should always have exactly one hyphen', () => {
      const code = generateReferralCode('john-doe-smith');
      const hyphens = code.split('-').length - 1;

      expect(hyphens).toBe(1);
    });

    it('should have consistent suffix length', () => {
      const codes = Array.from({ length: 100 }, () => generateReferralCode('test'));

      codes.forEach(code => {
        const suffix = code.split('-')[1];
        expect(suffix.length).toBe(6);
      });
    });
  });

  describe('Security Considerations', () => {
    it('should not expose sensitive information', () => {
      const sensitiveInput = 'password123secret';
      const code = generateReferralCode(sensitiveInput);

      // Should not contain the word "password" or "secret"
      expect(code.toLowerCase()).not.toContain('password');
      expect(code.toLowerCase()).not.toContain('secret');
    });

    it('should use cryptographically strong randomness', () => {
      // Generate many codes and check distribution
      const suffixes = new Set();
      const iterations = 10000;

      for (let i = 0; i < iterations; i++) {
        const code = generateReferralCode('test');
        const suffix = code.split('-')[1];
        suffixes.add(suffix);
      }

      // Should have high uniqueness (>99.9%)
      expect(suffixes.size / iterations).toBeGreaterThan(0.999);
    });
  });
});