/**
 * Production-Safe Error Handler (M1-SEC)
 *
 * SECURITY: Never expose internal error details to clients in production.
 * - Logs full error details server-side for debugging
 * - Returns sanitized error messages to clients
 * - Preserves error context for monitoring
 */

import logger from '@/lib/logger';

/**
 * Error response structure
 */
interface ErrorResponse {
  error: string;
  code?: string;
  requestId?: string;
}

/**
 * Error context for logging
 */
interface ErrorContext {
  operation: string;
  userId?: string;
  resourceId?: string;
  additionalData?: Record<string, unknown>;
}

/**
 * Generate a unique request ID for error tracking
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Handle API errors with production-safe responses
 *
 * SECURITY: In production, returns generic error messages without internal details.
 * Full error details are logged server-side with a request ID for debugging.
 *
 * @param error - The caught error
 * @param context - Context about where/why the error occurred
 * @returns Response object with appropriate status and sanitized message
 *
 * @example
 * try {
 *   // ... api logic
 * } catch (error) {
 *   return handleApiError(error, { operation: 'createMember' });
 * }
 */
export function handleApiError(error: unknown, context: ErrorContext): Response {
  const requestId = generateRequestId();
  const isProduction = process.env.NODE_ENV === 'production';

  // Extract error details for logging
  const errorDetails = {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    name: error instanceof Error ? error.name : 'UnknownError',
  };

  // Log full error details server-side
  logger.error(`[${context.operation}] Error occurred`, {
    requestId,
    error: errorDetails,
    userId: context.userId,
    resourceId: context.resourceId,
    ...context.additionalData,
  });

  // Determine status code based on error type
  const statusCode = getStatusCodeFromError(error);

  // Build response with error message
  // SECURITY: Generic message in production, details in development
  const errorMessage = isProduction
    ? getGenericErrorMessage(statusCode)
    : errorDetails.message;

  const response: ErrorResponse = {
    error: errorMessage,
    requestId, // Always include for support queries
  };

  // Development: include error code for debugging
  if (!isProduction) {
    response.code = errorDetails.name;
  }

  return Response.json(response, { status: statusCode });
}

/**
 * Determine appropriate HTTP status code from error type
 */
function getStatusCodeFromError(error: unknown): number {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Authentication/Authorization errors
    if (message.includes('unauthorized') || message.includes('authentication')) {
      return 401;
    }
    if (message.includes('forbidden') || message.includes('permission')) {
      return 403;
    }

    // Not found
    if (message.includes('not found')) {
      return 404;
    }

    // Validation errors
    if (message.includes('invalid') || message.includes('validation')) {
      return 400;
    }

    // Rate limiting
    if (message.includes('rate limit') || message.includes('too many')) {
      return 429;
    }

    // Database/constraint errors
    if (message.includes('unique constraint') || message.includes('duplicate')) {
      return 409;
    }
  }

  // Default to 500 for unknown errors
  return 500;
}

/**
 * Get user-friendly error message based on status code
 * SECURITY: These messages are safe to expose to clients
 */
function getGenericErrorMessage(statusCode: number): string {
  switch (statusCode) {
    case 400:
      return 'Invalid request. Please check your input and try again.';
    case 401:
      return 'Authentication required. Please log in and try again.';
    case 403:
      return 'You do not have permission to perform this action.';
    case 404:
      return 'The requested resource was not found.';
    case 409:
      return 'This operation conflicts with existing data.';
    case 429:
      return 'Too many requests. Please wait a moment and try again.';
    case 500:
    default:
      return 'An error occurred. Please try again later.';
  }
}

/**
 * Create a custom API error with status code
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static badRequest(message: string): ApiError {
    return new ApiError(message, 400, 'BAD_REQUEST');
  }

  static unauthorized(message: string = 'Unauthorized'): ApiError {
    return new ApiError(message, 401, 'UNAUTHORIZED');
  }

  static forbidden(message: string = 'Forbidden'): ApiError {
    return new ApiError(message, 403, 'FORBIDDEN');
  }

  static notFound(message: string = 'Not found'): ApiError {
    return new ApiError(message, 404, 'NOT_FOUND');
  }

  static conflict(message: string): ApiError {
    return new ApiError(message, 409, 'CONFLICT');
  }

  static tooManyRequests(message: string = 'Too many requests'): ApiError {
    return new ApiError(message, 429, 'TOO_MANY_REQUESTS');
  }

  static internal(message: string = 'Internal server error'): ApiError {
    return new ApiError(message, 500, 'INTERNAL_ERROR');
  }
}

/**
 * Wrap an async handler with error handling
 *
 * @example
 * export const POST = withErrorHandler(async (request) => {
 *   // ... handler logic
 * }, 'createMember');
 */
export function withErrorHandler(
  handler: (request: Request) => Promise<Response>,
  operation: string
) {
  return async (request: Request): Promise<Response> => {
    try {
      return await handler(request);
    } catch (error) {
      return handleApiError(error, { operation });
    }
  };
}
