/**
 * Loading States Component Library
 *
 * Provides beautiful skeleton loaders and loading indicators
 * for all dashboard components
 */

import { Loader2 } from 'lucide-react';

/**
 * Dashboard Card Skeleton Loader
 */
export function CardSkeleton({ count = 1 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-6 animate-pulse"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="h-4 bg-gray-800 rounded w-1/3"></div>
            <div className="h-10 w-10 bg-gray-800 rounded-lg"></div>
          </div>
          <div className="h-8 bg-gray-800 rounded w-1/2 mb-3"></div>
          <div className="h-3 bg-gray-800 rounded w-2/3"></div>
        </div>
      ))}
    </>
  );
}

/**
 * Stats Grid Skeleton
 */
export function StatsGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <CardSkeleton count={4} />
    </div>
  );
}

/**
 * Table Row Skeleton
 */
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-800 p-4 bg-gray-900/30">
        <div className="flex gap-4">
          <div className="h-4 bg-gray-800 rounded w-1/4 animate-pulse"></div>
          <div className="h-4 bg-gray-800 rounded w-1/4 animate-pulse"></div>
          <div className="h-4 bg-gray-800 rounded w-1/4 animate-pulse"></div>
          <div className="h-4 bg-gray-800 rounded w-1/4 animate-pulse"></div>
        </div>
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="border-b border-gray-800 p-4 last:border-0 animate-pulse"
          style={{ animationDelay: `${i * 0.1}s` }}
        >
          <div className="flex gap-4">
            <div className="h-4 bg-gray-800 rounded w-1/4"></div>
            <div className="h-4 bg-gray-800 rounded w-1/4"></div>
            <div className="h-4 bg-gray-800 rounded w-1/4"></div>
            <div className="h-4 bg-gray-800 rounded w-1/4"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Chart Skeleton
 */
export function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <div
      className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-6"
      style={{ height: `${height}px` }}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="h-6 bg-gray-800 rounded w-1/4 animate-pulse"></div>
        <div className="h-4 bg-gray-800 rounded w-1/6 animate-pulse"></div>
      </div>

      {/* Chart bars */}
      <div className="flex items-end gap-2 h-full pb-8">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 bg-gradient-to-t from-purple-900/40 to-purple-900/10 rounded-t animate-pulse"
            style={{
              height: `${Math.random() * 80 + 20}%`,
              animationDelay: `${i * 0.05}s`,
            }}
          ></div>
        ))}
      </div>
    </div>
  );
}

/**
 * Full Page Loading Spinner
 */
export function PageLoader() {
  return (
    <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-4" />
        <p className="text-gray-400 text-lg">Loading...</p>
      </div>
    </div>
  );
}

/**
 * Inline Loading Spinner
 */
export function InlineLoader({ text }: { text?: string }) {
  return (
    <div className="flex items-center gap-2 text-gray-400">
      <Loader2 className="w-4 h-4 animate-spin" />
      {text && <span className="text-sm">{text}</span>}
    </div>
  );
}

/**
 * Button Loading State
 */
export function ButtonLoader() {
  return (
    <Loader2 className="w-4 h-4 animate-spin" />
  );
}

/**
 * Dashboard Page Skeleton (full page)
 */
export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-[#0F0F0F]">
      {/* Header Skeleton */}
      <header className="bg-[#1A1A1A] border-b border-[#2A2A2A]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="h-8 bg-gray-800 rounded w-1/3 mb-2 animate-pulse"></div>
              <div className="h-4 bg-gray-800 rounded w-1/4 animate-pulse"></div>
            </div>
            <div className="h-10 w-32 bg-gray-800 rounded animate-pulse"></div>
          </div>
        </div>
      </header>

      {/* Content Skeleton */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Referral card */}
          <CardSkeleton />

          {/* Stats grid */}
          <StatsGridSkeleton />

          {/* Chart */}
          <ChartSkeleton />

          {/* Table */}
          <TableSkeleton />
        </div>
      </main>
    </div>
  );
}

/**
 * Community Card Skeleton (for discover page)
 */
export function CommunityCardSkeleton({ count = 6 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 animate-pulse"
          style={{ animationDelay: `${i * 0.1}s` }}
        >
          <div className="flex items-start gap-4 mb-4">
            <div className="w-16 h-16 bg-gray-800 rounded-full"></div>
            <div className="flex-1">
              <div className="h-5 bg-gray-800 rounded w-2/3 mb-2"></div>
              <div className="h-3 bg-gray-800 rounded w-1/2"></div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between">
              <div className="h-3 bg-gray-800 rounded w-1/3"></div>
              <div className="h-3 bg-gray-800 rounded w-1/4"></div>
            </div>
            <div className="flex justify-between">
              <div className="h-3 bg-gray-800 rounded w-1/3"></div>
              <div className="h-3 bg-gray-800 rounded w-1/4"></div>
            </div>
          </div>

          <div className="h-10 bg-gray-800 rounded-lg mt-6"></div>
        </div>
      ))}
    </>
  );
}

/**
 * List Item Skeleton (for referrals list)
 */
export function ListItemSkeleton({ count = 5 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex justify-between items-center py-3 px-4 rounded-lg animate-pulse"
          style={{ animationDelay: `${i * 0.05}s` }}
        >
          <div className="flex-1">
            <div className="h-4 bg-gray-800 rounded w-1/4 mb-2"></div>
            <div className="h-3 bg-gray-800 rounded w-1/6"></div>
          </div>
          <div className="text-right">
            <div className="h-4 bg-gray-800 rounded w-16 mb-2"></div>
            <div className="h-3 bg-gray-800 rounded w-12"></div>
          </div>
        </div>
      ))}
    </>
  );
}
