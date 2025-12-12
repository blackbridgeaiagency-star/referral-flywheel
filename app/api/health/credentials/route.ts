/**
 * Credential Verification Endpoint
 *
 * Tests all Whop API credentials and returns status for each.
 * This endpoint does NOT perform any mutations - it only verifies credentials exist
 * and are properly formatted, with optional API connectivity tests.
 *
 * GET /api/health/credentials
 *
 * Returns JSON with status for each credential:
 * - green: Credential is present, properly formatted, and API call succeeded
 * - yellow: Credential is present but API verification skipped or couldn't be tested
 * - red: Credential is missing, malformed, or API call failed
 */

import { NextResponse } from 'next/server';
import { prisma, testDatabaseConnection } from '@/lib/db/prisma';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

// ============================================================================
// Types
// ============================================================================

type CredentialStatus = 'green' | 'yellow' | 'red';

interface CredentialCheck {
  status: CredentialStatus;
  message: string;
  details?: Record<string, unknown>;
}

interface CredentialsResponse {
  timestamp: string;
  overall: CredentialStatus;
  credentials: {
    WHOP_API_KEY: CredentialCheck;
    WHOP_AGENT_USER_ID: CredentialCheck;
    WHOP_WEBHOOK_SECRET: CredentialCheck;
    DATABASE_URL: CredentialCheck;
  };
  summary: {
    total: number;
    green: number;
    yellow: number;
    red: number;
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a string looks like a valid Whop API key
 * Format: typically starts with a specific prefix
 */
function isValidApiKeyFormat(key: string): boolean {
  // Whop API keys are typically long alphanumeric strings
  // They often start with specific prefixes like "whop_" or are UUIDs
  return key.length >= 20 && /^[a-zA-Z0-9_-]+$/.test(key);
}

/**
 * Check if a string looks like a valid Whop user ID
 * Format: user_XXXXXXXXXXXX
 */
function isValidUserIdFormat(userId: string): boolean {
  return /^user_[a-zA-Z0-9]+$/.test(userId);
}

/**
 * Check if a string looks like a valid webhook secret
 */
function isValidWebhookSecretFormat(secret: string): boolean {
  // Webhook secrets are typically long random strings
  return secret.length >= 16;
}

/**
 * Check if DATABASE_URL looks valid
 */
function isValidDatabaseUrlFormat(url: string): boolean {
  // Basic PostgreSQL URL format check
  return url.startsWith('postgresql://') || url.startsWith('postgres://');
}

/**
 * Test Whop API key by fetching company info
 */
async function testWhopApiKey(): Promise<CredentialCheck> {
  const apiKey = process.env.WHOP_API_KEY;

  // Check if present
  if (!apiKey) {
    return {
      status: 'red',
      message: 'WHOP_API_KEY is not set',
    };
  }

  // Check format
  if (!isValidApiKeyFormat(apiKey)) {
    return {
      status: 'red',
      message: 'WHOP_API_KEY appears to be malformed (expected alphanumeric string >= 20 chars)',
    };
  }

  // Try to fetch company info to verify the key works
  const companyId = process.env.NEXT_PUBLIC_WHOP_COMPANY_ID;

  if (!companyId) {
    return {
      status: 'yellow',
      message: 'WHOP_API_KEY is present and properly formatted, but cannot verify without NEXT_PUBLIC_WHOP_COMPANY_ID',
      details: {
        keyLength: apiKey.length,
        keyPrefix: apiKey.substring(0, 4) + '...',
      },
    };
  }

  try {
    const response = await fetch(`https://api.whop.com/api/v2/companies/${companyId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      return {
        status: 'green',
        message: 'WHOP_API_KEY is valid and API connection successful',
        details: {
          companyId: companyId,
          companyName: data?.data?.name || 'Unknown',
        },
      };
    }

    // Handle specific error codes
    if (response.status === 401) {
      return {
        status: 'red',
        message: 'WHOP_API_KEY is invalid or expired (401 Unauthorized)',
      };
    }

    if (response.status === 403) {
      return {
        status: 'yellow',
        message: 'WHOP_API_KEY may lack permissions for this company (403 Forbidden)',
        details: {
          companyId: companyId,
        },
      };
    }

    if (response.status === 404) {
      return {
        status: 'yellow',
        message: 'WHOP_API_KEY appears valid but company not found (404)',
        details: {
          companyId: companyId,
        },
      };
    }

    return {
      status: 'yellow',
      message: `WHOP_API_KEY verification returned unexpected status: ${response.status}`,
      details: {
        statusCode: response.status,
        statusText: response.statusText,
      },
    };
  } catch (error) {
    logger.error('Error testing WHOP_API_KEY:', error);
    return {
      status: 'yellow',
      message: 'WHOP_API_KEY is present but API test failed (network error)',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

/**
 * Test WHOP_AGENT_USER_ID - just verify it exists and is properly formatted
 * We do NOT send any test DMs
 */
function testWhopAgentUserId(): CredentialCheck {
  const agentUserId = process.env.WHOP_AGENT_USER_ID;

  // Check if present
  if (!agentUserId) {
    return {
      status: 'red',
      message: 'WHOP_AGENT_USER_ID is not set (required for sending DMs)',
    };
  }

  // Check format
  if (!isValidUserIdFormat(agentUserId)) {
    return {
      status: 'yellow',
      message: 'WHOP_AGENT_USER_ID is present but format may be incorrect (expected: user_XXXX)',
      details: {
        currentFormat: agentUserId.substring(0, Math.min(10, agentUserId.length)) + '...',
      },
    };
  }

  return {
    status: 'green',
    message: 'WHOP_AGENT_USER_ID is present and properly formatted',
    details: {
      userId: agentUserId.substring(0, 10) + '...',
    },
  };
}

/**
 * Test WHOP_WEBHOOK_SECRET - verify it exists and is properly formatted
 */
function testWhopWebhookSecret(): CredentialCheck {
  const webhookSecret = process.env.WHOP_WEBHOOK_SECRET;

  // Check if present
  if (!webhookSecret) {
    return {
      status: 'red',
      message: 'WHOP_WEBHOOK_SECRET is not set (required for webhook verification)',
    };
  }

  // Check format
  if (!isValidWebhookSecretFormat(webhookSecret)) {
    return {
      status: 'yellow',
      message: 'WHOP_WEBHOOK_SECRET is present but may be too short (expected >= 16 chars)',
      details: {
        length: webhookSecret.length,
      },
    };
  }

  return {
    status: 'green',
    message: 'WHOP_WEBHOOK_SECRET is present and properly formatted',
    details: {
      length: webhookSecret.length,
    },
  };
}

/**
 * Test DATABASE_URL - verify format and test connection
 */
async function testDatabaseUrl(): Promise<CredentialCheck> {
  const databaseUrl = process.env.DATABASE_URL;

  // Check if present
  if (!databaseUrl) {
    return {
      status: 'red',
      message: 'DATABASE_URL is not set',
    };
  }

  // Check format
  if (!isValidDatabaseUrlFormat(databaseUrl)) {
    return {
      status: 'red',
      message: 'DATABASE_URL appears malformed (expected postgresql:// or postgres://)',
    };
  }

  // Test actual connection
  try {
    const result = await testDatabaseConnection();

    if (result.success) {
      // Parse some safe details from the URL
      let host = 'unknown';
      try {
        const url = new URL(databaseUrl);
        host = url.hostname;
      } catch {
        // URL parsing failed, use placeholder
      }

      return {
        status: 'green',
        message: 'DATABASE_URL is valid and connection successful',
        details: {
          host: host,
          connected: true,
        },
      };
    }

    return {
      status: 'red',
      message: 'DATABASE_URL is present but connection failed',
      details: {
        error: result.error || 'Unknown connection error',
      },
    };
  } catch (error) {
    logger.error('Error testing DATABASE_URL:', error);
    return {
      status: 'red',
      message: 'DATABASE_URL connection test failed',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

/**
 * Calculate overall status from individual checks
 */
function calculateOverallStatus(checks: Record<string, CredentialCheck>): CredentialStatus {
  const statuses = Object.values(checks).map(c => c.status);

  if (statuses.some(s => s === 'red')) {
    return 'red';
  }

  if (statuses.some(s => s === 'yellow')) {
    return 'yellow';
  }

  return 'green';
}

// ============================================================================
// Route Handler
// ============================================================================

export async function GET(): Promise<NextResponse<CredentialsResponse>> {
  logger.info('Credential verification check started', undefined, 'health');

  const startTime = Date.now();

  try {
    // Run all checks (some in parallel where possible)
    const [whopApiKeyResult, databaseResult] = await Promise.all([
      testWhopApiKey(),
      testDatabaseUrl(),
    ]);

    // Synchronous checks
    const whopAgentUserIdResult = testWhopAgentUserId();
    const whopWebhookSecretResult = testWhopWebhookSecret();

    const credentials = {
      WHOP_API_KEY: whopApiKeyResult,
      WHOP_AGENT_USER_ID: whopAgentUserIdResult,
      WHOP_WEBHOOK_SECRET: whopWebhookSecretResult,
      DATABASE_URL: databaseResult,
    };

    // Calculate summary
    const statuses = Object.values(credentials).map(c => c.status);
    const summary = {
      total: statuses.length,
      green: statuses.filter(s => s === 'green').length,
      yellow: statuses.filter(s => s === 'yellow').length,
      red: statuses.filter(s => s === 'red').length,
    };

    const response: CredentialsResponse = {
      timestamp: new Date().toISOString(),
      overall: calculateOverallStatus(credentials),
      credentials,
      summary,
    };

    const responseTime = Date.now() - startTime;

    logger.info(`Credential check completed in ${responseTime}ms`, {
      overall: response.overall,
      summary,
    }, 'health');

    // Return appropriate HTTP status based on overall health
    const httpStatus = response.overall === 'red' ? 503 :
                       response.overall === 'yellow' ? 206 :
                       200;

    return NextResponse.json(response, {
      status: httpStatus,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Response-Time': `${responseTime}ms`,
        'X-Credential-Status': response.overall,
      },
    });
  } catch (error) {
    logger.error('Credential verification failed:', error, 'health');

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      overall: 'red' as CredentialStatus,
      credentials: {
        WHOP_API_KEY: { status: 'red' as CredentialStatus, message: 'Check failed due to error' },
        WHOP_AGENT_USER_ID: { status: 'red' as CredentialStatus, message: 'Check failed due to error' },
        WHOP_WEBHOOK_SECRET: { status: 'red' as CredentialStatus, message: 'Check failed due to error' },
        DATABASE_URL: { status: 'red' as CredentialStatus, message: 'Check failed due to error' },
      },
      summary: { total: 4, green: 0, yellow: 0, red: 4 },
    }, {
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Credential-Status': 'red',
      },
    });
  } finally {
    // Clean up database connection
    try {
      await prisma.$disconnect();
    } catch (disconnectError) {
      logger.error('Error disconnecting from database:', disconnectError, 'health');
    }
  }
}
