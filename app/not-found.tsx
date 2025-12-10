'use client';

import { Button } from '../components/ui/button';
import { SearchX, Home, ArrowLeft, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-3xl animate-pulse"></div>

      <div className="max-w-lg w-full text-center relative z-10">
        {/* 404 illustration */}
        <div className="inline-flex items-center justify-center w-28 h-28 rounded-full bg-gradient-to-br from-purple-900/40 to-pink-900/40 border-2 border-purple-500/50 mb-8 shadow-2xl shadow-purple-600/30">
          <SearchX className="w-14 h-14 text-purple-300" />
        </div>

        {/* 404 message */}
        <h1 className="text-8xl font-bold mb-4 bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
          404
        </h1>
        <h2 className="text-3xl font-bold text-white mb-4">Page Not Found</h2>
        <p className="text-lg text-gray-300 mb-6 leading-relaxed max-w-md mx-auto">
          The page you're looking for doesn't exist or has been moved.
        </p>

        {/* Whop-specific guidance */}
        <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4 mb-8 text-left">
          <p className="text-yellow-400 font-semibold mb-2">Accessing via Whop?</p>
          <p className="text-gray-400 text-sm">
            If you're a <strong className="text-white">member</strong>, access this app through your Whop membership dashboard.
            <br />
            If you're a <strong className="text-white">creator</strong>, access it through your Whop business dashboard.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <Link href="/discover">
            <Button
              className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-lg py-6 px-8 shadow-2xl shadow-purple-600/50 hover:shadow-purple-600/70 hover:scale-105 transition-all duration-300"
            >
              <Home className="w-5 h-5 mr-2" />
              Go to Discover
            </Button>
          </Link>
          <Button
            onClick={() => router.back()}
            variant="outline"
            className="border-2 border-gray-600 bg-gray-800 hover:border-gray-500 hover:bg-gray-700 text-white text-lg py-6 px-8 transition-all duration-300"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Go Back
          </Button>
        </div>

        {/* Helpful links */}
        <div className="bg-gradient-to-br from-gray-900/80 to-gray-900/40 border border-gray-700 hover:border-gray-600 rounded-xl p-6 backdrop-blur transition-all duration-300">
          <p className="text-sm text-gray-400 mb-4 font-semibold uppercase tracking-wider">
            Quick Links
          </p>
          <div className="flex flex-col gap-3 text-base">
            <Link
              href="/discover"
              className="text-purple-400 hover:text-purple-300 hover:underline transition-colors font-medium"
            >
              → Browse Communities
            </Link>
            <a
              href="https://whop.com/apps/app_xa1a8NaAKUVPuO/install/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 hover:text-purple-300 hover:underline transition-colors font-medium inline-flex items-center gap-1"
            >
              → Install on Whop <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="https://whop.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 hover:text-purple-300 hover:underline transition-colors font-medium inline-flex items-center gap-1"
            >
              → Whop Dashboard <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
