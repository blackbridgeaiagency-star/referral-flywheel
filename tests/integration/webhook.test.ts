// tests/integration/webhook.test.ts
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { POST } from '@/app/api/webhooks/whop/route';
import { prisma } from '@/lib/db/prisma';
import crypto from 'crypto';

// Mock Prisma
jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    member: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    creator: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    commission: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    attributionClick: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  },
}));

describe('Webhook Handler Integration', () => {
  const WEBHOOK_SECRET = 'test_webhook_secret';
  process.env.WHOP_WEBHOOK_SECRET = WEBHOOK_SECRET;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Payment Processing', () => {
    it('should process initial payment correctly', async () => {
      const payload = {
        action: 'app_payment.succeeded',
        data: {
          id: 'pay_123',
          membership_id: 'mem_123',
          company_id: 'comp_123',
          company_name: 'Test Company',
          product_id: 'prod_123',
          user_id: 'user_123',
          email: 'test@example.com',
          username: 'testuser',
          final_amount: 4999, // $49.99 in cents
        },
      };

      const body = JSON.stringify(payload);
      const signature = crypto.createHmac('sha256', WEBHOOK_SECRET).update(body).digest('hex');

      const request = new Request('http://localhost:3000/api/webhooks/whop', {
        method: 'POST',
        headers: {
          'whop-signature': signature,
        },
        body,
      });

      // Mock database responses
      (prisma.commission.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.member.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.creator.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.creator.create as jest.Mock).mockResolvedValue({ id: 'creator_123' });
      (prisma.member.create as jest.Mock).mockResolvedValue({
        id: 'member_123',
        referralCode: 'TESTUSER-ABC123',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(prisma.member.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user_123',
            membershipId: 'mem_123',
            email: 'test@example.com',
            username: 'testuser',
            subscriptionPrice: 49.99,
          }),
        })
      );
    });

    it('should handle idempotent payments', async () => {
      const payload = {
        action: 'app_payment.succeeded',
        data: {
          id: 'pay_123',
          membership_id: 'mem_123',
          company_id: 'comp_123',
          final_amount: 4999,
        },
      };

      const body = JSON.stringify(payload);
      const request = new Request('http://localhost:3000/api/webhooks/whop', {
        method: 'POST',
        body,
      });

      // Mock that commission already exists
      (prisma.commission.findUnique as jest.Mock).mockResolvedValue({
        id: 'commission_123',
        whopPaymentId: 'pay_123',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Payment already processed');
      expect(data.commissionId).toBe('commission_123');
      expect(prisma.member.create).not.toHaveBeenCalled();
    });

    it('should process recurring payment with commission', async () => {
      const payload = {
        action: 'app_payment.succeeded',
        data: {
          id: 'pay_456',
          membership_id: 'mem_123',
          company_id: 'comp_123',
          final_amount: 4999,
        },
      };

      const body = JSON.stringify(payload);
      const request = new Request('http://localhost:3000/api/webhooks/whop', {
        method: 'POST',
        body,
      });

      // Mock existing member with referral
      (prisma.commission.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.member.findUnique as jest.Mock)
        .mockResolvedValueOnce({
          id: 'member_123',
          referredBy: 'REFERRER-XYZ789',
          creatorId: 'creator_123',
        })
        .mockResolvedValueOnce({
          id: 'referrer_123',
          referralCode: 'REFERRER-XYZ789',
        });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(prisma.commission.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            whopPaymentId: 'pay_456',
            saleAmount: 49.99,
            memberShare: 5.00,
            creatorShare: 34.99,
            platformShare: 10.00,
            paymentType: 'recurring',
            status: 'paid',
          }),
        })
      );
    });

    it('should not process commission for organic members', async () => {
      const payload = {
        action: 'app_payment.succeeded',
        data: {
          id: 'pay_789',
          membership_id: 'mem_456',
          company_id: 'comp_123',
          final_amount: 4999,
        },
      };

      const body = JSON.stringify(payload);
      const request = new Request('http://localhost:3000/api/webhooks/whop', {
        method: 'POST',
        body,
      });

      // Mock existing organic member (no referredBy)
      (prisma.commission.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.member.findUnique as jest.Mock).mockResolvedValue({
        id: 'member_456',
        referredBy: null, // Organic member
        creatorId: 'creator_123',
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(prisma.commission.create).not.toHaveBeenCalled();
    });
  });

  describe('Security', () => {
    it('should reject invalid webhook signature', async () => {
      const payload = { action: 'app_payment.succeeded', data: {} };
      const body = JSON.stringify(payload);

      const request = new Request('http://localhost:3000/api/webhooks/whop', {
        method: 'POST',
        headers: {
          'whop-signature': 'invalid_signature',
        },
        body,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Invalid signature');
    });

    it('should accept webhook without signature in test mode', async () => {
      const payload = {
        action: 'app_payment.succeeded',
        data: {
          id: 'pay_test',
          membership_id: 'mem_test',
          company_id: 'comp_test',
        },
      };

      const body = JSON.stringify(payload);
      const request = new Request('http://localhost:3000/api/webhooks/whop', {
        method: 'POST',
        body,
      });

      (prisma.commission.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.member.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await POST(request);

      expect(response.status).toBe(200);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing required data', async () => {
      const payload = {
        action: 'app_payment.succeeded',
        data: {
          // Missing required fields
          final_amount: 4999,
        },
      };

      const body = JSON.stringify(payload);
      const request = new Request('http://localhost:3000/api/webhooks/whop', {
        method: 'POST',
        body,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required webhook data');
    });

    it('should handle database errors gracefully', async () => {
      const payload = {
        action: 'app_payment.succeeded',
        data: {
          id: 'pay_error',
          membership_id: 'mem_error',
          company_id: 'comp_error',
          final_amount: 4999,
        },
      };

      const body = JSON.stringify(payload);
      const request = new Request('http://localhost:3000/api/webhooks/whop', {
        method: 'POST',
        body,
      });

      // Mock database error
      (prisma.commission.findUnique as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });
});