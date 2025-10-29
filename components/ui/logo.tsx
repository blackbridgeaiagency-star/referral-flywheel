'use client';

import { useState } from 'react';
import Image from 'next/image';

interface LogoProps {
  size?: number;
  className?: string;
}

/**
 * Referral Flywheel Logo Component
 *
 * Features:
 * - Attempts to load logo.png from public folder
 * - Falls back to SVG logo if PNG fails
 * - Optimized with Next.js Image component
 * - Handles loading states gracefully
 */
export function Logo({ size = 128, className = '' }: LogoProps) {
  const [imageError, setImageError] = useState(false);

  // If PNG logo failed to load, render SVG fallback
  if (imageError) {
    return <SVGLogo size={size} className={className} />;
  }

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <Image
        src="/logo.png"
        alt="Referral Flywheel Logo"
        width={size}
        height={size}
        className="object-contain drop-shadow-2xl"
        onError={() => setImageError(true)}
        priority
      />
    </div>
  );
}

/**
 * SVG Fallback Logo
 *
 * Clean, animated SVG logo that works even if PNG fails
 */
function SVGLogo({ size, className }: { size: number; className?: string }) {
  return (
    <div
      className={`flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-2xl"
      >
        {/* Outer circle - Purple gradient */}
        <circle
          cx="100"
          cy="100"
          r="90"
          fill="url(#gradient1)"
          className="animate-pulse"
        />

        {/* Inner circle - Darker purple */}
        <circle
          cx="100"
          cy="100"
          r="70"
          fill="#1a0b2e"
        />

        {/* Flywheel arrows (circular motion) */}
        <g transform="translate(100, 100)">
          {/* Arrow 1 - Top */}
          <path
            d="M 0,-50 L -8,-35 L 8,-35 Z"
            fill="#a855f7"
            className="animate-spin"
            style={{ animationDuration: '3s' }}
          />

          {/* Arrow 2 - Right */}
          <path
            d="M 50,0 L 35,8 L 35,-8 Z"
            fill="#ec4899"
            className="animate-spin"
            style={{ animationDuration: '3s', animationDelay: '0.75s' }}
          />

          {/* Arrow 3 - Bottom */}
          <path
            d="M 0,50 L 8,35 L -8,35 Z"
            fill="#a855f7"
            className="animate-spin"
            style={{ animationDuration: '3s', animationDelay: '1.5s' }}
          />

          {/* Arrow 4 - Left */}
          <path
            d="M -50,0 L -35,-8 L -35,8 Z"
            fill="#ec4899"
            className="animate-spin"
            style={{ animationDuration: '3s', animationDelay: '2.25s' }}
          />
        </g>

        {/* Center icon - Dollar sign */}
        <text
          x="100"
          y="115"
          fontSize="60"
          fontWeight="bold"
          fill="#a855f7"
          textAnchor="middle"
          className="font-sans"
        >
          $
        </text>

        {/* Gradient definitions */}
        <defs>
          <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="50%" stopColor="#ec4899" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

/**
 * Logo with text variant
 */
export function LogoWithText({ size = 128, className = '' }: LogoProps) {
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <Logo size={size} />
      <div className="flex flex-col">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          Referral Flywheel
        </h1>
        <p className="text-sm text-gray-400">
          Turn Every Member Into an Affiliate
        </p>
      </div>
    </div>
  );
}
