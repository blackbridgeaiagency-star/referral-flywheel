// lib/api/swagger.ts
import { createSwaggerSpec } from 'next-swagger-doc';

/**
 * OpenAPI/Swagger Documentation
 *
 * Comprehensive API documentation for all endpoints
 * Includes request/response schemas, authentication, and examples
 */

export const swaggerSpec = createSwaggerSpec({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Referral Flywheel API',
      version: '1.0.0',
      description: `
        # Referral Flywheel API Documentation

        A comprehensive referral management system for Whop communities.

        ## Overview
        The Referral Flywheel API provides endpoints for:
        - Member dashboard data and statistics
        - Creator analytics and management
        - Webhook processing for payments
        - Leaderboards and rankings
        - Administrative functions

        ## Authentication
        Most endpoints require authentication via Bearer token or API key.

        ## Rate Limiting
        - Public endpoints: 30 requests/minute
        - Authenticated endpoints: 60 requests/minute
        - Webhook endpoints: 100 requests/minute

        ## Commission Structure
        - Member commission: 10%
        - Creator commission: 70%
        - Platform fee: 20%
      `,
      contact: {
        name: 'API Support',
        email: 'support@referralflywheel.com',
        url: 'https://docs.referralflywheel.com',
      },
      license: {
        name: 'Private',
        url: 'https://referralflywheel.com/terms',
      },
    },
    servers: [
      {
        url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        description: 'Development server',
      },
      {
        url: 'https://api.referralflywheel.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token for authenticated requests',
        },
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API key for server-to-server communication',
        },
        WebhookSignature: {
          type: 'apiKey',
          in: 'header',
          name: 'whop-signature',
          description: 'HMAC signature for webhook validation',
        },
      },
      schemas: {
        // Error Response
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message',
            },
            message: {
              type: 'string',
              description: 'Detailed error description',
            },
            statusCode: {
              type: 'integer',
              description: 'HTTP status code',
            },
          },
        },

        // Member Schema
        Member: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string' },
            membershipId: { type: 'string' },
            email: { type: 'string', format: 'email' },
            username: { type: 'string' },
            referralCode: {
              type: 'string',
              pattern: '^[A-Z]+-[A-Z0-9]{6}$',
              example: 'JOHN-ABC123',
            },
            referredBy: { type: 'string', nullable: true },
            lifetimeEarnings: { type: 'number', minimum: 0 },
            monthlyEarnings: { type: 'number', minimum: 0 },
            totalReferred: { type: 'integer', minimum: 0 },
            monthlyReferred: { type: 'integer', minimum: 0 },
            globalEarningsRank: { type: 'integer', nullable: true },
            globalReferralsRank: { type: 'integer', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },

        // Commission Schema
        Commission: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            whopPaymentId: { type: 'string' },
            whopMembershipId: { type: 'string' },
            saleAmount: { type: 'number', minimum: 0 },
            memberShare: { type: 'number', minimum: 0 },
            creatorShare: { type: 'number', minimum: 0 },
            platformShare: { type: 'number', minimum: 0 },
            paymentType: {
              type: 'string',
              enum: ['initial', 'recurring'],
            },
            status: {
              type: 'string',
              enum: ['pending', 'paid', 'failed'],
            },
            paidAt: { type: 'string', format: 'date-time', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },

        // Creator Schema
        Creator: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            companyId: { type: 'string' },
            companyName: { type: 'string' },
            productId: { type: 'string' },
            totalReferrals: { type: 'integer', minimum: 0 },
            totalRevenue: { type: 'number', minimum: 0 },
            monthlyRevenue: { type: 'number', minimum: 0 },
            tier1Count: { type: 'integer', default: 5 },
            tier1Reward: { type: 'string', default: '1 month free' },
            tier2Count: { type: 'integer', default: 10 },
            tier2Reward: { type: 'string', default: '3 months free' },
            tier3Count: { type: 'integer', default: 25 },
            tier3Reward: { type: 'string', default: '6 months free' },
            tier4Count: { type: 'integer', default: 100 },
            tier4Reward: { type: 'string', default: 'Lifetime access' },
          },
        },

        // Webhook Payload
        WebhookPayload: {
          type: 'object',
          required: ['action', 'data'],
          properties: {
            action: {
              type: 'string',
              enum: ['app_payment.succeeded', 'app_payment.failed', 'membership.cancelled'],
            },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                membership_id: { type: 'string' },
                company_id: { type: 'string' },
                product_id: { type: 'string' },
                user_id: { type: 'string' },
                email: { type: 'string', format: 'email' },
                username: { type: 'string' },
                final_amount: { type: 'integer', description: 'Amount in cents' },
              },
            },
          },
        },

        // Leaderboard Entry
        LeaderboardEntry: {
          type: 'object',
          properties: {
            rank: { type: 'integer' },
            memberId: { type: 'string' },
            username: { type: 'string' },
            referralCount: { type: 'integer' },
            earnings: { type: 'number' },
            trend: {
              type: 'string',
              enum: ['up', 'down', 'stable'],
            },
          },
        },

        // Earnings History
        EarningsHistory: {
          type: 'object',
          properties: {
            date: { type: 'string', format: 'date' },
            amount: { type: 'number' },
            commissionCount: { type: 'integer' },
          },
        },
      },
    },
    paths: {
      // Webhook endpoint
      '/api/webhooks/whop': {
        post: {
          tags: ['Webhooks'],
          summary: 'Process Whop payment webhook',
          description: 'Receives and processes payment events from Whop',
          security: [{ WebhookSignature: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/WebhookPayload' },
              },
            },
          },
          responses: {
            '200': {
              description: 'Webhook processed successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ok: { type: 'boolean', default: true },
                    },
                  },
                },
              },
            },
            '400': { $ref: '#/components/responses/BadRequest' },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '500': { $ref: '#/components/responses/InternalError' },
          },
        },
      },

      // Leaderboard endpoint
      '/api/leaderboard': {
        get: {
          tags: ['Leaderboard'],
          summary: 'Get leaderboard rankings',
          description: 'Returns top performers by earnings or referrals',
          parameters: [
            {
              name: 'type',
              in: 'query',
              required: false,
              schema: {
                type: 'string',
                enum: ['earnings', 'referrals'],
                default: 'earnings',
              },
            },
            {
              name: 'limit',
              in: 'query',
              required: false,
              schema: {
                type: 'integer',
                minimum: 1,
                maximum: 100,
                default: 20,
              },
            },
            {
              name: 'creatorId',
              in: 'query',
              required: false,
              schema: { type: 'string' },
              description: 'Filter by creator ID',
            },
          ],
          responses: {
            '200': {
              description: 'Leaderboard data',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      leaderboard: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/LeaderboardEntry' },
                      },
                      userPosition: {
                        type: 'integer',
                        nullable: true,
                      },
                    },
                  },
                },
              },
            },
            '429': { $ref: '#/components/responses/TooManyRequests' },
          },
        },
      },

      // Earnings history endpoint
      '/api/earnings/history': {
        get: {
          tags: ['Earnings'],
          summary: 'Get member earnings history',
          description: 'Returns daily earnings for the past 30 days',
          security: [{ BearerAuth: [] }],
          parameters: [
            {
              name: 'memberId',
              in: 'query',
              required: true,
              schema: { type: 'string' },
            },
            {
              name: 'days',
              in: 'query',
              required: false,
              schema: {
                type: 'integer',
                minimum: 1,
                maximum: 90,
                default: 30,
              },
            },
          ],
          responses: {
            '200': {
              description: 'Earnings history data',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/EarningsHistory' },
                  },
                },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
      },

      // Monthly reset cron
      '/api/cron/reset-monthly': {
        get: {
          tags: ['Cron'],
          summary: 'Monthly statistics reset',
          description: 'Resets monthly earnings and referral counts',
          security: [{ ApiKeyAuth: [] }],
          responses: {
            '200': {
              description: 'Reset successful',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      membersReset: { type: 'integer' },
                      creatorsReset: { type: 'integer' },
                      duration: { type: 'integer' },
                      timestamp: { type: 'string', format: 'date-time' },
                    },
                  },
                },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },

      // Webhook stats (admin)
      '/api/admin/webhook-stats': {
        get: {
          tags: ['Admin'],
          summary: 'Get webhook processing statistics',
          description: 'Returns real-time webhook monitoring data',
          security: [{ BearerAuth: [] }],
          parameters: [
            {
              name: 'range',
              in: 'query',
              schema: {
                type: 'string',
                enum: ['1h', '24h', '7d', '30d'],
                default: '24h',
              },
            },
          ],
          responses: {
            '200': {
              description: 'Webhook statistics',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      stats: {
                        type: 'object',
                        properties: {
                          total: { type: 'integer' },
                          successful: { type: 'integer' },
                          failed: { type: 'integer' },
                          avgDuration: { type: 'number' },
                          successRate: { type: 'number' },
                          totalRevenue: { type: 'number' },
                        },
                      },
                      events: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                            timestamp: { type: 'string', format: 'date-time' },
                            status: { type: 'string' },
                            duration: { type: 'number' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    components: {
      responses: {
        BadRequest: {
          description: 'Bad request',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
        Unauthorized: {
          description: 'Unauthorized',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
        NotFound: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
        TooManyRequests: {
          description: 'Too many requests',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  error: { type: 'string' },
                  retryAfter: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
        InternalError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
      },
    },
  },
  apiFolder: 'app/api',
});