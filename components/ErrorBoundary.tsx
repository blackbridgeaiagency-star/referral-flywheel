'use client';

import React, { Component, ReactNode } from 'react';
import logger from '../lib/logger';


interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('ErrorBoundary caught an error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });
    this.setState({
      error,
      errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-[#1A1A1A] border border-red-500/30 rounded-xl p-8">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-red-400 mb-2">Something went wrong</h1>
              <span className="inline-block px-2 py-1 bg-red-900/30 text-red-400 text-xs rounded font-mono">
                REACT ERROR BOUNDARY
              </span>
            </div>

            <p className="text-gray-300 mb-6">
              An unexpected error occurred while rendering this page.
              This could be a temporary issue. Please try refreshing the page.
            </p>

            {this.state.error && (
              <div className="bg-gray-900 border border-gray-700 rounded p-4 mb-6">
                <p className="text-xs text-gray-500 mb-1">Error Message:</p>
                <p className="text-sm font-mono text-red-300">
                  {this.state.error.toString()}
                </p>
              </div>
            )}

            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
              <details className="mb-6">
                <summary className="text-gray-400 cursor-pointer hover:text-gray-300 transition-colors">
                  Show Error Details (Development Only)
                </summary>
                <pre className="mt-2 text-xs text-gray-500 bg-gray-900 p-4 rounded overflow-auto">
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors"
              >
                Refresh Page
              </button>
              <a
                href="/"
                className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
              >
                Go to Home
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Specialized error boundary for database-related errors
export function DatabaseErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-[#1A1A1A] border border-red-500/30 rounded-xl p-8">
            <h1 className="text-3xl font-bold text-red-400 mb-4">Database Connection Error</h1>

            <div className="space-y-4 mb-6">
              <div className="bg-gray-900 border border-gray-700 rounded p-4">
                <h3 className="text-gray-300 font-semibold mb-2">Quick Fixes:</h3>
                <ol className="list-decimal list-inside text-gray-400 space-y-2 text-sm">
                  <li>Check if your Supabase project is active (not paused)</li>
                  <li>Verify DATABASE_URL in Vercel environment variables</li>
                  <li>Ensure password is URL-encoded if it has special characters</li>
                  <li>Use port 6543 for pooled connections with ?pgbouncer=true</li>
                </ol>
              </div>

              <div className="bg-gray-900 border border-gray-700 rounded p-4">
                <h3 className="text-gray-300 font-semibold mb-2">Debug Tools:</h3>
                <div className="flex gap-2 flex-wrap">
                  <a
                    href="/api/health"
                    target="_blank"
                    className="text-purple-400 hover:text-purple-300 text-sm underline"
                  >
                    System Health Check
                  </a>
                  <span className="text-gray-600">•</span>
                  <a
                    href="/api/debug/db-test"
                    target="_blank"
                    className="text-purple-400 hover:text-purple-300 text-sm underline"
                  >
                    Database Test
                  </a>
                  <span className="text-gray-600">•</span>
                  <a
                    href="https://supabase.com/dashboard"
                    target="_blank"
                    className="text-purple-400 hover:text-purple-300 text-sm underline"
                  >
                    Supabase Dashboard
                  </a>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors"
              >
                Retry Connection
              </button>
              <a
                href="https://whop.com/dashboard"
                className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
              >
                Back to Whop
              </a>
            </div>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}