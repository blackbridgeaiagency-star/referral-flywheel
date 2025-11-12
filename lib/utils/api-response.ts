/**
 * Standardized API Response Utilities
 * Ensures consistent error formatting across all API routes
 */

import { NextResponse } from 'next/server';
import logger from '../logger';


export interface ApiError {
  error: string;
  code: string;
  details?: string;
  timestamp?: string;
}

export interface ApiSuccess<T = any> {
  ok: true;
  data: T;
  timestamp?: string;
}

/**
 * Standard error codes
 */
export const ErrorCodes = {
  // Client errors (400s)
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  MISSING_PARAMETER: 'MISSING_PARAMETER',

  // Server errors (500s)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
} as const;

/**
 * Create standardized error response
 */
export function errorResponse(
  error: string,
  code: keyof typeof ErrorCodes,
  statusCode: number = 500,
  details?: string
): NextResponse<ApiError> {
  return NextResponse.json(
    {
      error,
      code: ErrorCodes[code],
      details,
      timestamp: new Date().toISOString(),
    },
    { status: statusCode }
  );
}

/**
 * Create standardized success response
 */
export function successResponse<T>(
  data: T,
  statusCode: number = 200
): NextResponse<ApiSuccess<T>> {
  return NextResponse.json(
    {
      ok: true,
      data,
      timestamp: new Date().toISOString(),
    },
    { status: statusCode }
  );
}

/**
 * Validation error response (400)
 */
export function validationError(message: string, details?: string): NextResponse<ApiError> {
  return errorResponse(message, 'VALIDATION_ERROR', 400, details);
}

/**
 * Not found error response (404)
 */
export function notFoundError(resource: string): NextResponse<ApiError> {
  return errorResponse(`${resource} not found`, 'NOT_FOUND', 404);
}

/**
 * Unauthorized error response (401)
 */
export function unauthorizedError(message: string = 'Unauthorized'): NextResponse<ApiError> {
  return errorResponse(message, 'UNAUTHORIZED', 401);
}

/**
 * Internal server error response (500)
 */
export function internalError(error: unknown): NextResponse<ApiError> {
  const message = error instanceof Error ? error.message : 'Internal server error';
  const details = process.env.NODE_ENV === 'development' ? String(error) : undefined;

  logger.error('Internal API error:', error);

  return errorResponse('Internal server error', 'INTERNAL_ERROR', 500, details);
}

/**
 * Database error response (500)
 */
export function databaseError(error: unknown): NextResponse<ApiError> {
  const message = 'Database operation failed';
  const details = process.env.NODE_ENV === 'development' && error instanceof Error
    ? error.message
    : undefined;

  logger.error('Database error:', error);

  return errorResponse(message, 'DATABASE_ERROR', 500, details);
}
