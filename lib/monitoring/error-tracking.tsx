// lib/monitoring/error-tracking.ts
import * as Sentry from '@sentry/nextjs';
import React from 'react';

/**
 * Enhanced Error Tracking Utilities
 *
 * Provides structured error logging with automatic Sentry integration
 * and fallback to console logging when Sentry is not configured
 */

// Error severity levels
export enum ErrorSeverity {
  DEBUG = 'debug',
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  FATAL = 'fatal',
}

// Error categories for better organization
export enum ErrorCategory {
  COMMISSION = 'commission',
  WEBHOOK = 'webhook',
  DATABASE = 'database',
  AUTHENTICATION = 'authentication',
  VALIDATION = 'validation',
  NETWORK = 'network',
  BUSINESS_LOGIC = 'business_logic',
  THIRD_PARTY = 'third_party',
  UNKNOWN = 'unknown',
}

interface ErrorContext {
  userId?: string;
  membershipId?: string;
  creatorId?: string;
  referralCode?: string;
  paymentId?: string;
  endpoint?: string;
  action?: string;
  metadata?: Record<string, any>;
}

/**
 * Track an error with full context
 */
export function trackError(
  error: Error | string,
  category: ErrorCategory = ErrorCategory.UNKNOWN,
  severity: ErrorSeverity = ErrorSeverity.ERROR,
  context?: ErrorContext
): void {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const errorObject = typeof error === 'string' ? new Error(error) : error;

  // Always log to console for development
  const logMethod = severity === ErrorSeverity.ERROR || severity === ErrorSeverity.FATAL
    ? console.error
    : severity === ErrorSeverity.WARNING
    ? console.warn
    : console.log;

  logMethod(`[${category.toUpperCase()}] ${errorMessage}`, context);

  // Send to Sentry if available
  if (typeof window !== 'undefined' ? window.Sentry : global.Sentry) {
    Sentry.withScope(scope => {
      // Set error category and severity
      scope.setLevel(severity as Sentry.SeverityLevel);
      scope.setTag('error.category', category);

      // Add context if provided
      if (context) {
        if (context.userId) scope.setUser({ id: context.userId });
        if (context.endpoint) scope.setTag('endpoint', context.endpoint);
        if (context.action) scope.setTag('action', context.action);

        // Add all context as extra data
        Object.entries(context).forEach(([key, value]) => {
          scope.setContext(key, value);
        });
      }

      // Capture the error
      Sentry.captureException(errorObject);
    });
  }
}

/**
 * Track a commission-related error (always critical)
 */
export function trackCommissionError(
  error: Error | string,
  details: {
    paymentId?: string;
    membershipId?: string;
    referrerCode?: string;
    amount?: number;
    type?: 'initial' | 'recurring';
  }
): void {
  trackError(
    error,
    ErrorCategory.COMMISSION,
    ErrorSeverity.ERROR,
    {
      paymentId: details.paymentId,
      membershipId: details.membershipId,
      referralCode: details.referrerCode,
      metadata: {
        amount: details.amount,
        paymentType: details.type,
        timestamp: new Date().toISOString(),
      },
    }
  );

  // Also send an alert for commission errors
  sendAlert({
    type: 'commission_error',
    message: typeof error === 'string' ? error : error.message,
    severity: 'high',
    details,
  });
}

/**
 * Track a webhook processing error
 */
export function trackWebhookError(
  error: Error | string,
  webhookData: {
    action?: string;
    paymentId?: string;
    membershipId?: string;
    rawPayload?: any;
  }
): void {
  trackError(
    error,
    ErrorCategory.WEBHOOK,
    ErrorSeverity.ERROR,
    {
      action: webhookData.action,
      paymentId: webhookData.paymentId,
      membershipId: webhookData.membershipId,
      endpoint: '/api/webhooks/whop',
      metadata: {
        rawPayload: webhookData.rawPayload,
      },
    }
  );
}

/**
 * Track database errors with query context
 */
export function trackDatabaseError(
  error: Error | string,
  query?: {
    model?: string;
    operation?: string;
    args?: any;
  }
): void {
  trackError(
    error,
    ErrorCategory.DATABASE,
    ErrorSeverity.ERROR,
    {
      metadata: {
        model: query?.model,
        operation: query?.operation,
        args: query?.args,
      },
    }
  );
}

/**
 * Track performance metrics
 */
export function trackPerformance(
  name: string,
  duration: number,
  metadata?: Record<string, any>
): void {
  // Log slow operations
  if (duration > 1000) {
    console.warn(`Slow operation: ${name} took ${duration}ms`, metadata);
  }

  // Send to Sentry as a transaction
  if (typeof window !== 'undefined' ? window.Sentry : global.Sentry) {
    const transaction = Sentry.startTransaction({
      name,
      op: 'performance',
      data: metadata,
    });

    transaction.setData('duration_ms', duration);
    transaction.setStatus('ok');
    transaction.finish();
  }
}

/**
 * Track custom events
 */
export function trackEvent(
  eventName: string,
  category: string,
  metadata?: Record<string, any>
): void {
  // Log the event
  console.log(`[EVENT] ${category}: ${eventName}`, metadata);

  // Send to Sentry as breadcrumb
  if (typeof window !== 'undefined' ? window.Sentry : global.Sentry) {
    Sentry.addBreadcrumb({
      message: eventName,
      category,
      level: 'info',
      data: metadata,
    });
  }
}

/**
 * Track successful commission processing
 */
export function trackCommissionSuccess(details: {
  paymentId: string;
  membershipId: string;
  referrerCode: string;
  amount: number;
  memberShare: number;
  type: 'initial' | 'recurring';
}): void {
  trackEvent(
    'commission_processed',
    'commission',
    {
      ...details,
      timestamp: new Date().toISOString(),
    }
  );
}

/**
 * Send critical alerts (for Slack, email, etc.)
 */
export async function sendAlert(alert: {
  type: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details?: any;
}): Promise<void> {
  // Log the alert
  console.error(`[ALERT] ${alert.severity.toUpperCase()}: ${alert.message}`, alert.details);

  // Send to monitoring service
  if (process.env.MONITORING_WEBHOOK_URL) {
    try {
      await fetch(process.env.MONITORING_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...alert,
          app: 'referral-flywheel',
          environment: process.env.NODE_ENV,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error('Failed to send alert:', error);
    }
  }

  // Also capture in Sentry as an event
  if (typeof window !== 'undefined' ? window.Sentry : global.Sentry) {
    Sentry.captureMessage(alert.message, alert.severity as Sentry.SeverityLevel);
  }
}

/**
 * Create a monitored function wrapper
 */
export function monitored<T extends (...args: any[]) => any>(
  fn: T,
  name: string,
  category: ErrorCategory = ErrorCategory.UNKNOWN
): T {
  return (async (...args: Parameters<T>) => {
    const startTime = Date.now();

    try {
      const result = await fn(...args);

      // Track performance
      const duration = Date.now() - startTime;
      if (duration > 1000) {
        trackPerformance(name, duration, { args });
      }

      return result;
    } catch (error) {
      // Track the error
      trackError(
        error as Error,
        category,
        ErrorSeverity.ERROR,
        {
          action: name,
          metadata: { args },
        }
      );

      // Re-throw the error
      throw error;
    }
  }) as T;
}

/**
 * Initialize error boundaries for React components
 */
export function ErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <Sentry.ErrorBoundary
      fallback={({ error, resetError }) => (
        <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
            <h2 className="text-2xl font-bold text-red-600 mb-4">
              Something went wrong
            </h2>
            <p className="text-gray-600 mb-4">
              {error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={resetError}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Try again
            </button>
          </div>
        </div>
      )}
      showDialog
      onError={(error, errorInfo) => {
        trackError(error, ErrorCategory.UNKNOWN, ErrorSeverity.ERROR, {
          metadata: errorInfo,
        });
      }}
    >
      {children}
    </Sentry.ErrorBoundary>
  );
}