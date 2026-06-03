'use client';

import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string;
  trend?: number;
  trendLabel?: string;
  status?: 'green' | 'orange' | 'red' | 'blue' | 'neutral';
  icon?: React.ReactNode;
  subtitle?: string;
}

const STATUS_STYLES = {
  green: 'border-emerald-500/20 bg-emerald-500/5',
  orange: 'border-amber-500/20 bg-amber-500/5',
  red: 'border-rose-500/20 bg-rose-500/5',
  blue: 'border-blue-500/20 bg-blue-500/5',
  neutral: 'border-border',
};

const STATUS_VALUE = {
  green: 'text-emerald-400',
  orange: 'text-amber-400',
  red: 'text-rose-400',
  blue: 'text-blue-400',
  neutral: 'text-foreground',
};

const STATUS_DOT = {
  green: 'bg-emerald-500',
  orange: 'bg-amber-500',
  red: 'bg-rose-500',
  blue: 'bg-blue-500',
  neutral: 'bg-muted-foreground',
};

export function KpiCard({ title, value, trend, trendLabel, status = 'neutral', icon, subtitle }: KpiCardProps) {
  const trendPositive = trend !== undefined && trend > 0;
  const trendNeutral = trend === undefined || trend === 0;

  return (
    <div className={cn(
      'rounded-xl border p-5 bg-card shadow-sm transition-all hover:shadow-md',
      STATUS_STYLES[status]
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {status !== 'neutral' && (
            <span className={cn('w-2 h-2 rounded-full shrink-0 mt-0.5', STATUS_DOT[status])} />
          )}
          <span className="text-sm font-medium text-muted-foreground">{title}</span>
        </div>
        {icon && <div className="text-muted-foreground/60">{icon}</div>}
      </div>

      <div className={cn('text-2xl font-bold tracking-tight', STATUS_VALUE[status])}>
        {value}
      </div>

      {subtitle && (
        <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>
      )}

      {trend !== undefined && (
        <div className="flex items-center gap-1.5 mt-3">
          {trendNeutral ? (
            <Minus className="w-3 h-3 text-muted-foreground" />
          ) : trendPositive ? (
            <TrendingUp className="w-3 h-3 text-emerald-400" />
          ) : (
            <TrendingDown className="w-3 h-3 text-rose-400" />
          )}
          <span className={cn(
            'text-xs font-medium',
            trendNeutral ? 'text-muted-foreground' : trendPositive ? 'text-emerald-400' : 'text-rose-400'
          )}>
            {trend > 0 ? '+' : ''}{trend?.toFixed(1)}%
          </span>
          {trendLabel && <span className="text-xs text-muted-foreground">{trendLabel}</span>}
        </div>
      )}
    </div>
  );
}
