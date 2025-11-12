// lib/monitoring/error-tracking.tsx
// Simplified error tracking without Sentry
// To enable Sentry: npm install @sentry/nextjs and restore the original implementation

import React from 'react';
import logger from '../logger';


/**
 * Error tracking utilities - console-only implementation
 * Sentry integration has been disabled as the package is not installed
 */

export enum ErrorCategory {
  PAYMENT = 'payment',
  DATABASE = 'database',
  WEBHOOK = 'webhook',
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  RATE_LIMIT = 'rate_limit',
  GENERAL = 'general',
}

export enum ErrorSeverity {
  CRITICAL = 'critical',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
}

interface ErrorContext {
  userId?: string;
  memberId?: string;
  creatorId?: string;
  endpoint?: string;
  method?: string;
  action?: string;
  metadata?: Record<string, any>;
}

/**
 * Track an error - logs to console only (Sentry disabled)
 */
export function trackError(
  error: Error | unknown,
  category: ErrorCategory = ErrorCategory.GENERAL,
  context?: ErrorContext,
  severity: ErrorSeverity = ErrorSeverity.ERROR
): void {
  const errorObject = error instanceof Error ? error : new Error(String(error));
  const errorMessage = errorObject.message || 'Unknown error';

  const logMethod =
    severity === ErrorSeverity.CRITICAL || severity === ErrorSeverity.ERROR
    ? console.error
    : severity === ErrorSeverity.WARNING
    ? console.warn
    : console.log;

  logMethod(`[${category.toUpperCase()}] ${errorMessage}`, context);
}

/**
 * Track a commission-related error (always critical)
 */
export function trackCommissionError(
  error: Error | unknown,
  context: {
    whopPaymentId?: string;
    memberId?: string;
    creatorId?: string;
    amount?: number;
    stage?: 'webhook' | 'validation' | 'calculation' | 'database' | 'notification';
  }
): void {
  trackError(
    error,
    ErrorCategory.PAYMENT,
    context as ErrorContext,
    ErrorSeverity.CRITICAL
  );
}

/**
 * Track a webhook error
 */
export function trackWebhookError(
  error: Error | unknown,
  context: {
    webhookType?: string;
    eventId?: string;
    payload?: any;
    retryCount?: number;
  }
): void {
  trackError(
    error,
    ErrorCategory.WEBHOOK,
    context as ErrorContext,
    ErrorSeverity.ERROR
  );
}

/**
 * Track a database error
 */
export function trackDatabaseError(
  error: Error | unknown,
  context: {
    operation?: string;
    model?: string;
    query?: any;
  }
): void {
  trackError(
    error,
    ErrorCategory.DATABASE,
    context as ErrorContext,
    ErrorSeverity.ERROR
  );
}

/**
 * Track a performance metric - logs to console only
 */
export function trackPerformance(
  name: string,
  duration: number,
  metadata?: Record<string, any>
): void {
  logger.debug(`[PERFORMANCE] ${name}: ${duration}ms`, metadata);
}

/**
 * Track a custom event - logs to console only
 */
export function trackEvent(
  name: string,
  data?: Record<string, any>
): void {
  logger.debug(`[EVENT] ${name}`, data);
}

/**
 * Send a system alert - logs to console only
 */
export async function sendAlert(alert: {
  title: string;
  message: string;
  severity: 'critical' | 'warning' | 'info';
  context?: Record<string, any>;
}): Promise<void> {
  const logMethod =
    alert.severity === 'critical' ? console.error :
    alert.severity === 'warning' ? console.warn :
    console.log;

  logMethod(`[ALERT] ${alert.title}: ${alert.message}`, alert.context);
}

/**
 * Error Boundary Component - simple fallback without Sentry
 */
export function ErrorBoundary({
  children,
  fallback,
  showDialog = true
}: {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
  showDialog?: boolean;
}) {
  return (
    <React.Fragment>
      {children}
    </React.Fragment>
  );
}

/**
 * With error boundary HOC - returns component as-is (Sentry disabled)
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryOptions?: Parameters<typeof ErrorBoundary>[0]
) {
  return Component;
}