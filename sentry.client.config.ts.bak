// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,

    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Session Replay
    replaysSessionSampleRate: 0.1, // 10% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

    // Release tracking
    release: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',

    environment: process.env.NODE_ENV || 'development',

    // Integrations
    integrations: [
      Sentry.replayIntegration({
        // Mask sensitive data in session replays
        maskAllText: false,
        maskAllInputs: true,
        blockAllMedia: false,

        // Privacy settings
        privacy: {
          maskTextSelector: '[data-sensitive]',
          maskInputOptions: {
            password: true,
            email: true,
            tel: true,
          },
        },
      }),

      Sentry.browserTracingIntegration({
        // Trace specific user interactions
        routingInstrumentation: Sentry.nextRouterInstrumentation,
      }),
    ],

    // Filtering
    beforeSend(event, hint) {
      // Filter out non-error events in development
      if (process.env.NODE_ENV === 'development' && event.level !== 'error') {
        return null;
      }

      // Filter out known third-party errors
      const error = hint.originalException;
      if (error && error instanceof Error) {
        // Ignore Chrome extension errors
        if (error.message?.includes('Extension context')) return null;

        // Ignore network errors that are expected
        if (error.message?.includes('NetworkError')) return null;

        // Ignore ResizeObserver errors (common and harmless)
        if (error.message?.includes('ResizeObserver')) return null;
      }

      // Sanitize sensitive data
      if (event.request) {
        // Remove auth tokens from headers
        if (event.request.headers) {
          delete event.request.headers['Authorization'];
          delete event.request.headers['x-api-key'];
          delete event.request.headers['whop-signature'];
        }

        // Remove sensitive query params
        if (event.request.query_string) {
          event.request.query_string = event.request.query_string
            .replace(/token=[^&]+/g, 'token=***')
            .replace(/api_key=[^&]+/g, 'api_key=***');
        }
      }

      // Add user context if available
      const userId = localStorage.getItem('userId');
      const membershipId = localStorage.getItem('membershipId');

      if (userId || membershipId) {
        event.user = {
          id: userId || undefined,
          membership_id: membershipId || undefined,
        };
      }

      return event;
    },

    // Breadcrumb filtering
    beforeBreadcrumb(breadcrumb, hint) {
      // Filter out noisy breadcrumbs
      if (breadcrumb.category === 'console' && breadcrumb.level === 'debug') {
        return null;
      }

      // Don't log form submissions with sensitive data
      if (breadcrumb.category === 'ui.click' && breadcrumb.message?.includes('password')) {
        return null;
      }

      return breadcrumb;
    },

    // Additional options
    autoSessionTracking: true,
    sendClientReports: true,

    // Attachments
    attachStacktrace: true,

    // Transport options
    transportOptions: {
      // Retry failed requests
      retryDelay: 5000,
    },
  });

  // Custom error boundary
  Sentry.setContext('app', {
    name: 'Referral Flywheel',
    version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
    environment: process.env.NODE_ENV,
  });

  // Add custom tags for better filtering
  Sentry.setTag('app.component', 'client');
  Sentry.setTag('app.platform', 'web');
}