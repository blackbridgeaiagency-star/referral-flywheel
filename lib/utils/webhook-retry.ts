import logger from '../logger';

/**
 * Webhook Retry Logic with Exponential Backoff
 * Handles webhook processing failures with automatic retries
 */

interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number; // milliseconds
  maxDelay?: number; // milliseconds
  onRetry?: (attempt: number, error: Error) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 8000, // 8 seconds
  onRetry: (attempt, error) => {
    logger.debug(`⏳ Retry attempt ${attempt}:`, error.message);
  }
};

/**
 * Execute a function with exponential backoff retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // If this was the last attempt, throw the error
      if (attempt === opts.maxAttempts) {
        logger.error(`❌ All ${opts.maxAttempts} retry attempts failed`);
        throw lastError;
      }

      // Calculate delay with exponential backoff: 1s, 2s, 4s, 8s
      const delay = Math.min(
        opts.baseDelay * Math.pow(2, attempt - 1),
        opts.maxDelay
      );

      // Call retry callback
      opts.onRetry(attempt, lastError);

      // Wait before retrying
      await sleep(delay);
    }
  }

  // TypeScript requires this, but we'll never reach here
  throw lastError!;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry-specific error types
 */
export class RetryableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RetryableError';
  }
}

export class NonRetryableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NonRetryableError';
  }
}

/**
 * Check if an error should be retried
 */
export function shouldRetry(error: unknown): boolean {
  if (error instanceof NonRetryableError) {
    return false;
  }

  if (error instanceof RetryableError) {
    return true;
  }

  // Retry on network errors, timeouts, and database connection issues
  const errorMessage = error instanceof Error ? error.message : String(error);
  const retryablePatterns = [
    /network/i,
    /timeout/i,
    /ECONNRESET/i,
    /ETIMEDOUT/i,
    /connection pool/i,
    /connection.*closed/i,
    /temporary failure/i,
  ];

  return retryablePatterns.some(pattern => pattern.test(errorMessage));
}
