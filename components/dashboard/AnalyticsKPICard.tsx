'use client';

import { Card, CardContent } from '../ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '../../lib/utils';

interface AnalyticsKPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: number; // Percentage change
  trendLabel?: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning';
  className?: string;
}

const variantStyles = {
  default: {
    iconBg: 'bg-gray-500/20',
    iconText: 'text-gray-400',
    border: 'border-gray-700/50',
    gradient: 'from-gray-600/10 via-gray-900/20 to-transparent',
  },
  primary: {
    iconBg: 'bg-purple-500/20',
    iconText: 'text-purple-400',
    border: 'border-purple-500/30',
    gradient: 'from-purple-600/20 via-purple-900/30 to-transparent',
  },
  success: {
    iconBg: 'bg-green-500/20',
    iconText: 'text-green-400',
    border: 'border-green-500/30',
    gradient: 'from-green-600/20 via-green-900/30 to-transparent',
  },
  warning: {
    iconBg: 'bg-yellow-500/20',
    iconText: 'text-yellow-400',
    border: 'border-yellow-500/30',
    gradient: 'from-yellow-600/20 via-yellow-900/30 to-transparent',
  },
};

export function AnalyticsKPICard({
  title,
  value,
  subtitle,
  trend,
  trendLabel,
  icon,
  variant = 'default',
  className,
}: AnalyticsKPICardProps) {
  const styles = variantStyles[variant];

  const renderTrend = () => {
    if (trend === undefined || trend === null) return null;

    const isPositive = trend > 0;
    const isNeutral = trend === 0;
    const Icon = isPositive ? TrendingUp : isNeutral ? Minus : TrendingDown;

    return (
      <div
        className={cn(
          'flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full',
          isPositive && 'bg-green-500/20 text-green-400',
          isNeutral && 'bg-gray-500/20 text-gray-400',
          !isPositive && !isNeutral && 'bg-red-500/20 text-red-400'
        )}
      >
        <Icon className="w-3 h-3" />
        <span>{isPositive ? '+' : ''}{trend.toFixed(1)}%</span>
        {trendLabel && <span className="text-gray-500 ml-1">{trendLabel}</span>}
      </div>
    );
  };

  return (
    <Card
      className={cn(
        'bg-[#1A1A1A] border overflow-hidden relative transition-all duration-300',
        'hover:shadow-xl hover:scale-[1.02] group',
        styles.border,
        className
      )}
    >
      {/* Background gradient effect */}
      <div
        className={cn(
          'absolute inset-0 bg-gradient-to-br opacity-50 transition-opacity duration-300',
          'group-hover:opacity-100',
          styles.gradient
        )}
      />

      {/* Glow effect on hover */}
      <div
        className={cn(
          'absolute inset-0 bg-gradient-to-br blur-xl opacity-0',
          'group-hover:opacity-20 transition-opacity duration-300',
          styles.gradient
        )}
      />

      <CardContent className="p-6 relative z-10">
        <div className="flex items-start justify-between mb-4">
          {icon && (
            <div
              className={cn(
                'p-2.5 rounded-xl border backdrop-blur',
                styles.iconBg,
                styles.iconText,
                styles.border
              )}
            >
              {icon}
            </div>
          )}
          {renderTrend()}
        </div>

        <p className="text-sm text-gray-400 mb-1 font-medium">{title}</p>
        <p className="text-3xl font-bold text-white mb-1 transition-all">
          {value}
        </p>
        {subtitle && (
          <p className="text-xs text-gray-500 leading-relaxed">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}
