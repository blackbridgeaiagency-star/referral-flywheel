#!/usr/bin/env tsx

/**
 * Test script to verify the enhanced authentication setup
 * Run with: npx tsx scripts/test-auth-setup.ts
 */

import { verifyWhopJWT } from '../lib/whop/jwt-verification';
import { verifyAuthorizedUser, verifyActiveMembership } from '../lib/whop/api-verification';
import { createSession, encodeSession, decodeSession } from '../lib/whop/session-cache';
import * as dotenv from 'dotenv';
import logger from '../lib/logger';


// Load environment variables
dotenv.config({ path: '.env.local' });

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

async function testJWTVerification() {
  logger.debug(`\n${colors.blue}🔐 Testing JWT Verification${colors.reset}`);
  logger.debug('-'.repeat(50));

  // Test with a sample JWT (you'll need a real one from Whop for production)
  const sampleJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoidGVzdF91c2VyIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwiaWF0IjoxNjE2MjM5MDIyfQ.test';

  try {
    const result = await verifyWhopJWT(sampleJWT);

    if (result) {
      logger.debug(`${colors.green}✅ JWT decoded successfully${colors.reset}`);
      logger.debug('User ID:', result.user_id);
      logger.debug('Email:', result.email);
    } else {
      logger.debug(`${colors.yellow}⚠️  JWT verification failed (expected in dev without real token)${colors.reset}`);
    }
  } catch (error) {
    logger.debug(`${colors.red}❌ JWT test error:${colors.reset}`, error);
  }

  // Check configuration
  logger.debug('\n📋 JWT Configuration:');
  logger.debug(`- WHOP_PUBLIC_KEY: ${process.env.WHOP_PUBLIC_KEY ? 'Set ✅' : 'Not set ⚠️'}`);
  logger.debug(`- WHOP_JWKS_URI: ${process.env.WHOP_JWKS_URI || 'Not set'}`);
  logger.debug(`- Development mode: ${process.env.NODE_ENV === 'development' ? 'Yes (fallback enabled)' : 'No'}`);
}

async function testSessionManagement() {
  logger.debug(`\n${colors.blue}🍪 Testing Session Management${colors.reset}`);
  logger.debug('-'.repeat(50));

  try {
    // Create a test session
    const session = await createSession({
      user_id: 'test_user_123',
      email: 'test@example.com',
      username: 'testuser',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    logger.debug(`${colors.green}✅ Session created${colors.reset}`);
    logger.debug('Session user ID:', session.userId);
    logger.debug('Session expires at:', new Date(session.expiresAt).toLocaleString());

    // Encode session
    const encoded = await encodeSession(session);
    logger.debug(`${colors.green}✅ Session encoded${colors.reset}`);
    logger.debug('Token length:', encoded.length);

    // Decode session
    const decoded = await decodeSession(encoded);
    if (decoded) {
      logger.debug(`${colors.green}✅ Session decoded${colors.reset}`);
      logger.debug('Decoded user ID:', decoded.userId);
    }

    // Check configuration
    logger.debug('\n📋 Session Configuration:');
    logger.debug(`- SESSION_SECRET: ${process.env.SESSION_SECRET ? `Set (${process.env.SESSION_SECRET.length} chars) ✅` : 'Not set ❌'}`);
    logger.debug(`- SESSION_MAX_AGE: ${process.env.SESSION_MAX_AGE || '86400'} seconds`);
    logger.debug(`- ENABLE_SESSION_CACHE: ${process.env.ENABLE_SESSION_CACHE || 'false'}`);

  } catch (error) {
    logger.debug(`${colors.red}❌ Session test error:${colors.reset}`, error);
  }
}

async function testAPIVerification() {
  logger.debug(`\n${colors.blue}🌐 Testing API Verification${colors.reset}`);
  logger.debug('-'.repeat(50));

  // Test with sample IDs
  const testUserId = 'user_test123';
  const testCompanyId = 'biz_test456';

  logger.debug('Test User ID:', testUserId);
  logger.debug('Test Company ID:', testCompanyId);

  try {
    // This will fail without real IDs, but shows the system is working
    logger.debug('\n🔍 Testing authorization check...');
    const isAuthorized = await verifyAuthorizedUser(testUserId, testCompanyId);
    logger.debug(`Authorization result: ${isAuthorized ? '✅ Authorized' : '❌ Not authorized'}`);

    logger.debug('\n🔍 Testing membership check...');
    const hasMembership = await verifyActiveMembership(testUserId, testCompanyId);
    logger.debug(`Membership result: ${hasMembership ? '✅ Active' : '❌ Not active'}`);

    // Check configuration
    logger.debug('\n📋 API Configuration:');
    logger.debug(`- WHOP_API_KEY: ${process.env.WHOP_API_KEY ? `Set (${process.env.WHOP_API_KEY.substring(0, 10)}...) ✅` : 'Not set ❌'}`);
    logger.debug(`- ENABLE_API_VERIFICATION: ${process.env.ENABLE_API_VERIFICATION || 'false'}`);

  } catch (error) {
    logger.debug(`${colors.yellow}⚠️  API verification test failed (expected without real data)${colors.reset}`);
  }
}

async function checkEnvironment() {
  logger.debug(`\n${colors.blue}🔧 Environment Check${colors.reset}`);
  logger.debug('-'.repeat(50));

  const requiredVars = [
    'WHOP_API_KEY',
    'SESSION_SECRET',
    'DATABASE_URL',
  ];

  const optionalVars = [
    'WHOP_PUBLIC_KEY',
    'WHOP_JWKS_URI',
    'ENABLE_API_VERIFICATION',
    'ENABLE_SESSION_CACHE',
    'SESSION_MAX_AGE',
  ];

  logger.debug('Required Variables:');
  requiredVars.forEach(varName => {
    const isSet = !!process.env[varName];
    logger.debug(`  ${varName}: ${isSet ? colors.green + '✅ Set' : colors.red + '❌ Missing'}${colors.reset}`);
  });

  logger.debug('\nOptional Variables:');
  optionalVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      logger.debug(`  ${varName}: ${colors.green}✅ ${value.substring(0, 30)}${value.length > 30 ? '...' : ''}${colors.reset}`);
    } else {
      logger.debug(`  ${varName}: ${colors.yellow}⚠️  Not set${colors.reset}`);
    }
  });
}

async function main() {
  logger.debug(`${colors.blue}${'='.repeat(60)}${colors.reset}`);
  logger.debug(`${colors.blue}  Whop Authentication Setup Test${colors.reset}`);
  logger.debug(`${colors.blue}${'='.repeat(60)}${colors.reset}`);

  await checkEnvironment();
  await testSessionManagement();
  await testJWTVerification();
  await testAPIVerification();

  logger.debug(`\n${colors.blue}${'='.repeat(60)}${colors.reset}`);
  logger.debug(`${colors.green}✅ Test Complete!${colors.reset}`);
  logger.debug(`${colors.blue}${'='.repeat(60)}${colors.reset}`);

  logger.debug(`
${colors.yellow}⚠️  Next Steps:${colors.reset}

1. ${colors.yellow}Get Whop's Public Key:${colors.reset}
   - Contact Whop support for their JWT signing public key
   - Or check if they provide a JWKS endpoint

2. ${colors.yellow}Test with Real Data:${colors.reset}
   - Use a real Whop JWT token from the x-whop-user-token header
   - Test with real user IDs and company IDs

3. ${colors.yellow}Deploy to Production:${colors.reset}
   - Add all environment variables to Vercel
   - Ensure HTTPS is enabled
   - Test the full authentication flow
  `);
}

main().catch(console.error);