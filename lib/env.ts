import logger from './logger';

/**
 * Environment Variable Validation
 * Ensures all required environment variables are set before the app starts
 * Optimized for high-load production environments
 */

// Define required environment variables
const requiredVars = {
  // Database
  DATABASE_URL: process.env.DATABASE_URL,

  // Whop Integration
  WHOP_API_KEY: process.env.WHOP_API_KEY,
  WHOP_WEBHOOK_SECRET: process.env.WHOP_WEBHOOK_SECRET,
  NEXT_PUBLIC_WHOP_APP_ID: process.env.NEXT_PUBLIC_WHOP_APP_ID,
  NEXT_PUBLIC_WHOP_COMPANY_ID: process.env.NEXT_PUBLIC_WHOP_COMPANY_ID,
  NEXT_PUBLIC_WHOP_AGENT_USER_ID: process.env.NEXT_PUBLIC_WHOP_AGENT_USER_ID,

  // Application
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',

  // Security (required in production)
  ADMIN_API_KEY: process.env.ADMIN_API_KEY,
  CRON_SECRET: process.env.CRON_SECRET,
  EXPORT_API_KEY: process.env.EXPORT_API_KEY,
  SESSION_SECRET: process.env.SESSION_SECRET,
} as const;

// Optional environment variables with defaults
const optionalVars = {
  // Session configuration
  ENABLE_API_VERIFICATION: process.env.ENABLE_API_VERIFICATION === 'true',
  ENABLE_SESSION_CACHE: process.env.ENABLE_SESSION_CACHE === 'true',
  SESSION_MAX_AGE: parseInt(process.env.SESSION_MAX_AGE || '86400'),

  // Whop JWT (optional - will use fallback if not provided)
  WHOP_PUBLIC_KEY: process.env.WHOP_PUBLIC_KEY,
  WHOP_JWKS_URI: process.env.WHOP_JWKS_URI,

  // Email (optional)
  RESEND_API_KEY: process.env.RESEND_API_KEY,

  // Performance settings for high load
  DATABASE_POOL_SIZE: parseInt(process.env.DATABASE_POOL_SIZE || '25'), // Increased for high load
  DATABASE_CONNECTION_TIMEOUT: parseInt(process.env.DATABASE_CONNECTION_TIMEOUT || '5000'),
  API_RATE_LIMIT: parseInt(process.env.API_RATE_LIMIT || '100'), // Requests per minute
  CACHE_TTL: parseInt(process.env.CACHE_TTL || '300'), // 5 minutes default

  // Node.js performance settings
  NODE_ENV: process.env.NODE_ENV || 'development',
  NODE_OPTIONS: process.env.NODE_OPTIONS || '--max-old-space-size=4096', // 4GB heap for high load
} as const;

/**
 * Validates that all required environment variables are present
 * Throws an error if any required variables are missing
 */
function validateEnvironment(): void {
  const missing: string[] = [];
  const warnings: string[] = [];

  // Check required variables
  for (const [key, value] of Object.entries(requiredVars)) {
    if (!value) {
      // In development, some variables are optional
      if (process.env.NODE_ENV === 'development') {
        if (key.startsWith('ADMIN_') || key.startsWith('CRON_') || key.startsWith('EXPORT_') || key === 'SESSION_SECRET') {
          warnings.push(key);
          continue;
        }
      }
      missing.push(key);
    }
  }

  // Log warnings for optional missing vars in development
  if (warnings.length > 0 && process.env.NODE_ENV === 'development') {
    logger.warn('⚠️ Missing optional environment variables (using defaults):', warnings.join(', '));
  }

  // Throw error if required variables are missing
  if (missing.length > 0) {
    const errorMessage = `
❌ MISSING REQUIRED ENVIRONMENT VARIABLES:
${missing.join('\n')}

Please ensure all required environment variables are set.
Check .env.example for the complete list and documentation.

In production: Set these in your hosting provider's environment variables.
In development: Copy .env.example to .env.local and fill in the values.
`;

    // In production, always throw
    if (process.env.NODE_ENV === 'production') {
      throw new Error(errorMessage);
    }

    // In development, log error but continue (for easier setup)
    logger.error(errorMessage);

    // Still throw for critical missing vars even in development
    const criticalMissing = missing.filter(key =>
      key === 'DATABASE_URL' ||
      key === 'WHOP_API_KEY' ||
      key === 'WHOP_WEBHOOK_SECRET'
    );

    if (criticalMissing.length > 0) {
      throw new Error(`Cannot start without critical environment variables: ${criticalMissing.join(', ')}`);
    }
  }

  // Additional production checks
  if (process.env.NODE_ENV === 'production') {
    // Ensure APP_URL is HTTPS in production
    if (!process.env.NEXT_PUBLIC_APP_URL?.startsWith('https://')) {
      logger.warn('⚠️ NEXT_PUBLIC_APP_URL should use HTTPS in production');
    }

    // Warn if using default secrets (detect common patterns)
    if (process.env.ADMIN_API_KEY?.includes('GENERATE_RANDOM')) {
      throw new Error('❌ ADMIN_API_KEY appears to be a placeholder. Generate a real secret!');
    }

    // Check database URL has pooling enabled for high load
    if (!process.env.DATABASE_URL?.includes('pgbouncer=true')) {
      logger.warn('⚠️ DATABASE_URL should use connection pooling (pgbouncer=true) for high load');
    }
  }

  // Log successful validation
  if (process.env.NODE_ENV !== 'test') {
    logger.info('Environment variables validated successfully');

    // Log performance settings for high load
    console.log(`📊 High-load configuration:
  - Database pool size: ${optionalVars.DATABASE_POOL_SIZE}
  - API rate limit: ${optionalVars.API_RATE_LIMIT} req/min
  - Cache TTL: ${optionalVars.CACHE_TTL}s
  - Node heap size: ${optionalVars.NODE_OPTIONS}
`);
  }
}

// Run validation on module load
validateEnvironment();

// Export validated environment variables with proper types
export const env = {
  ...requiredVars,
  ...optionalVars,

  // Helper methods
  isDevelopment: () => optionalVars.NODE_ENV === 'development',
  isProduction: () => optionalVars.NODE_ENV === 'production',
  isTest: () => optionalVars.NODE_ENV === 'test',
} as const;

// Type-safe environment variable access
export type Env = typeof env;

// Export individual vars for convenience
export const {
  DATABASE_URL,
  WHOP_API_KEY,
  WHOP_WEBHOOK_SECRET,
  NEXT_PUBLIC_WHOP_APP_ID,
  NEXT_PUBLIC_WHOP_COMPANY_ID,
  NEXT_PUBLIC_WHOP_AGENT_USER_ID,
  NEXT_PUBLIC_APP_URL,
  ADMIN_API_KEY,
  CRON_SECRET,
  EXPORT_API_KEY,
  SESSION_SECRET,
  ENABLE_API_VERIFICATION,
  ENABLE_SESSION_CACHE,
  SESSION_MAX_AGE,
  WHOP_PUBLIC_KEY,
  WHOP_JWKS_URI,
  RESEND_API_KEY,
  DATABASE_POOL_SIZE,
  DATABASE_CONNECTION_TIMEOUT,
  API_RATE_LIMIT,
  CACHE_TTL,
  NODE_ENV,
  NODE_OPTIONS,
} = env;

export default env;