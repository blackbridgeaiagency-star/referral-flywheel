'use client';

import { AlertTriangle, ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useRouter } from 'next/navigation';

export default function InstallErrorPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-white flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-600/20 border-2 border-red-600 mb-6">
            <AlertTriangle className="w-10 h-10 text-red-400" />
          </div>

          <h1 className="text-3xl font-bold mb-3">Installation Failed</h1>
          <p className="text-gray-400 mb-8">
            We couldn't complete the app installation. This usually happens when accessing the app incorrectly.
          </p>
        </div>

        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-bold mb-3 text-white">How to Install Correctly:</h2>
          <ol className="space-y-3 text-gray-300">
            <li className="flex items-start gap-3">
              <span className="text-purple-400 font-bold">1.</span>
              <span>Go to your Whop Dashboard</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-purple-400 font-bold">2.</span>
              <span>Navigate to the App Store</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-purple-400 font-bold">3.</span>
              <span>Find "Referral Flywheel"</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-purple-400 font-bold">4.</span>
              <span>Click "Install" and follow the prompts</span>
            </li>
          </ol>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={() => router.push('/')}
            variant="outline"
            className="flex-1 border-gray-700 hover:bg-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>

          <Button
            onClick={() => window.location.href = 'https://whop.com/dashboard'}
            className="flex-1 bg-purple-600 hover:bg-purple-700"
          >
            Go to Whop Dashboard
            <RefreshCw className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}