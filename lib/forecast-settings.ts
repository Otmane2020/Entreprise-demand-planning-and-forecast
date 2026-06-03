export type ForecastGranularity = 'daily' | 'weekly' | 'monthly';
export type ForecastHorizonMonths = 3 | 6 | 12 | 24;

export interface ForecastPreferences {
  horizonMonths: ForecastHorizonMonths;
  granularity: ForecastGranularity;
}

const STORAGE_KEY = 'demandiq_forecast_preferences';

export const HORIZON_OPTIONS: { value: ForecastHorizonMonths; label: string }[] = [
  { value: 3, label: '3M' },
  { value: 6, label: '6M' },
  { value: 12, label: '12M' },
  { value: 24, label: '24M' },
];

export const GRANULARITY_OPTIONS: { value: ForecastGranularity; label: string; description: string }[] = [
  { value: 'daily', label: 'Jour', description: 'Daily' },
  { value: 'weekly', label: 'Semaine', description: 'Weekly' },
  { value: 'monthly', label: 'Mois', description: 'Monthly' },
];

export const DEFAULT_FORECAST_PREFERENCES: ForecastPreferences = {
  horizonMonths: 6,
  granularity: 'monthly',
};

export function loadForecastPreferences(): ForecastPreferences {
  if (typeof window === 'undefined') return DEFAULT_FORECAST_PREFERENCES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_FORECAST_PREFERENCES;
    return { ...DEFAULT_FORECAST_PREFERENCES, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_FORECAST_PREFERENCES;
  }
}

export function saveForecastPreferences(prefs: ForecastPreferences): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

/** Convert horizon months to API period count for the forecast engine. */
export function horizonToPeriods(months: ForecastHorizonMonths, granularity: ForecastGranularity): number {
  switch (granularity) {
    case 'daily':
      return months * 30;
    case 'weekly':
      return Math.ceil(months * (52 / 12));
    case 'monthly':
    default:
      return months;
  }
}

export function granularityLabel(granularity: ForecastGranularity): string {
  return GRANULARITY_OPTIONS.find(g => g.value === granularity)?.label ?? granularity;
}
