'use client';

import { useEffect } from 'react';
import { Button } from '../components/ui/button';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import logger from '../lib/logger';


export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to monitoring service
    logger.error('Global error boundary:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {/* Error icon */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-900/20 border-2 border-red-600 mb-6">
          <AlertCircle className="w-10 h-10 text-red-500" />
        </div>

        {/* Error message */}
        <h1 className="text-3xl font-bold text-white mb-3">Something Went Wrong</h1>
        <p className="text-gray-400 mb-8 leading-relaxed">
          We encountered an unexpected error. Don't worry, your data is safe. Please try again or contact support if the problem persists.
        </p>

        {/* Error details (development only) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 mb-6 text-left">
            <p className="text-xs font-mono text-red-400 break-all">
              {error.message}
            </p>
            {error.digest && (
              <p className="text-xs text-gray-500 mt-2">Error ID: {error.digest}</p>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={reset}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
          <Button
            onClick={() => (window.location.href = '/')}
            variant="outline"
            className="border-gray-700 hover:bg-gray-800 text-white"
          >
            <Home className="w-4 h-4 mr-2" />
            Go Home
          </Button>
        </div>

        {/* Support link */}
        <div className="mt-8 text-sm text-gray-500">
          <p>
            Need help?{' '}
            <a
              href="mailto:support@referral-flywheel.com"
              className="text-purple-400 hover:text-purple-300 underline"
            >
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
