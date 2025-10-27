// sentry.server.config.ts
import * as Sentry from '@sentry/nextjs';
import { prisma } from '@/lib/db/prisma';

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,

    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Release tracking
    release: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',

    environment: process.env.NODE_ENV || 'development',

    // Server-specific integrations
    integrations: [
      // Database query tracking
      Sentry.prismaIntegration({
        client: prisma,
      }),

      // HTTP request tracking
      Sentry.httpIntegration({
        tracing: true,
        breadcrumbs: true,
      }),
    ],

    // Filtering and processing
    beforeSend(event, hint) {
      // Only send errors in production
      if (process.env.NODE_ENV === 'development' && event.level !== 'error') {
        return null;
      }

      // Filter out expected errors
      const error = hint.originalException;
      if (error && error instanceof Error) {
        // Ignore Prisma connection errors during startup
        if (error.message?.includes('P1001') && process.env.NODE_ENV === 'development') {
          return null;
        }

        // Ignore rate limit errors (they're expected)
        if (error.message?.includes('Too Many Requests')) {
          return null;
        }

        // Ignore not found errors
        if (error.message?.includes('NOT_FOUND')) {
          return null;
        }
      }

      // Sanitize database queries
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map(breadcrumb => {
          if (breadcrumb.category === 'query' || breadcrumb.category === 'prisma') {
            // Remove sensitive data from queries
            if (breadcrumb.data?.query) {
              breadcrumb.data.query = breadcrumb.data.query
                .replace(/password\s*=\s*'[^']+'/gi, "password='***'")
                .replace(/email\s*=\s*'[^']+'/gi, "email='***'")
                .replace(/token\s*=\s*'[^']+'/gi, "token='***'");
            }
          }
          return breadcrumb;
        });
      }

      // Add server context
      event.contexts = {
        ...event.contexts,
        runtime: {
          name: 'Node.js',
          version: process.version,
        },
        app: {
          app_memory: process.memoryUsage().heapUsed,
          app_start_time: new Date(Date.now() - process.uptime() * 1000).toISOString(),
        },
      };

      // Enhanced error categorization
      if (error instanceof Error) {
        // Categorize database errors
        if (error.message?.includes('P20') || error.message?.includes('P10')) {
          event.tags = { ...event.tags, error_category: 'database' };
        }
        // Categorize webhook errors
        else if (error.stack?.includes('webhook')) {
          event.tags = { ...event.tags, error_category: 'webhook' };
        }
        // Categorize API errors
        else if (error.stack?.includes('/api/')) {
          event.tags = { ...event.tags, error_category: 'api' };
        }
        // Categorize commission errors
        else if (error.message?.toLowerCase().includes('commission')) {
          event.tags = { ...event.tags, error_category: 'commission' };
          event.level = 'error'; // Always treat commission errors as critical
        }
      }

      return event;
    },

    // Breadcrumb filtering
    beforeBreadcrumb(breadcrumb, hint) {
      // Filter out health check requests
      if (breadcrumb.category === 'http' && breadcrumb.data?.url?.includes('/health')) {
        return null;
      }

      // Filter out static asset requests
      if (breadcrumb.category === 'http' && breadcrumb.data?.url?.includes('/_next/')) {
        return null;
      }

      // Enhance database breadcrumbs
      if (breadcrumb.category === 'query' || breadcrumb.category === 'prisma') {
        breadcrumb.level = 'debug';
        // Add query execution time if available
        if (breadcrumb.data?.duration_ms) {
          breadcrumb.data.slow_query = breadcrumb.data.duration_ms > 1000;
        }
      }

      return breadcrumb;
    },

    // Performance monitoring
    profilesSampleRate: 1.0,

    // Additional options
    autoSessionTracking: true,
    attachStacktrace: true,
    shutdownTimeout: 5000,

    // Server-specific settings
    serverName: process.env.VERCEL_URL || 'localhost',
    dist: process.env.VERCEL_GIT_COMMIT_SHA,
  });

  // Set initial scope
  Sentry.configureScope(scope => {
    scope.setTag('app.component', 'server');
    scope.setTag('app.platform', 'node');
    scope.setTag('runtime.version', process.version);
  });
}