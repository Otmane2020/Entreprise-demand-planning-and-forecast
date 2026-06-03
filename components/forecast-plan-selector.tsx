'use client';

import { cn } from '@/lib/utils';
import {
  type ForecastGranularity,
  type ForecastHorizonMonths,
  type ForecastPreferences,
  GRANULARITY_OPTIONS,
  HORIZON_OPTIONS,
} from '@/lib/forecast-settings';

interface ForecastPlanSelectorProps {
  value: ForecastPreferences;
  onChange: (value: ForecastPreferences) => void;
  className?: string;
  compact?: boolean;
}

export function ForecastPlanSelector({ value, onChange, className, compact }: ForecastPlanSelectorProps) {
  return (
    <div className={cn('space-y-4', className)}>
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">Horizon de prévision</p>
        <div className="flex flex-wrap gap-2">
          {HORIZON_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange({ ...value, horizonMonths: opt.value })}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-semibold border transition-colors',
                value.horizonMonths === opt.value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted/30 border-border hover:border-primary/40'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {!compact && (
          <p className="text-xs text-muted-foreground mt-1.5">
            {value.horizonMonths} mois calendaires
          </p>
        )}
      </div>

      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">Granularité</p>
        <div className="flex flex-wrap gap-2">
          {GRANULARITY_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange({ ...value, granularity: opt.value })}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium border transition-colors min-w-[5rem]',
                value.granularity === opt.value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted/30 border-border hover:border-primary/40'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {!compact && (
          <p className="text-xs text-muted-foreground mt-1.5">
            Agrégation {GRANULARITY_OPTIONS.find(g => g.value === value.granularity)?.description} des ventes
          </p>
        )}
      </div>
    </div>
  );
}

export type { ForecastPreferences, ForecastGranularity, ForecastHorizonMonths };
