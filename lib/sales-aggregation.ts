export interface SalesPoint {
  date: string;
  units_sold: number;
  revenue: number;
  promotion_flag: boolean;
  stockout_flag: boolean;
}

export type AggregationGranularity = 'daily' | 'weekly' | 'monthly';

function weekKey(isoDate: string): string {
  const d = new Date(isoDate + 'T12:00:00Z');
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function bucketKey(date: string, granularity: AggregationGranularity): string {
  if (granularity === 'monthly') return date.slice(0, 7) + '-01';
  if (granularity === 'weekly') return weekKey(date);
  return date.slice(0, 10);
}

export function aggregateSalesHistory(
  rows: SalesPoint[],
  granularity: AggregationGranularity
): SalesPoint[] {
  if (granularity === 'daily') {
    return [...rows].sort((a, b) => a.date.localeCompare(b.date));
  }

  const buckets = new Map<string, SalesPoint>();

  for (const row of rows) {
    const key = bucketKey(row.date, granularity);
    const existing = buckets.get(key);
    if (!existing) {
      buckets.set(key, {
        date: key.length === 7 ? `${key}-01` : key.startsWith('20') && key.includes('W') ? row.date.slice(0, 10) : key,
        units_sold: row.units_sold,
        revenue: row.revenue,
        promotion_flag: row.promotion_flag,
        stockout_flag: row.stockout_flag,
      });
      continue;
    }
    existing.units_sold += row.units_sold;
    existing.revenue += row.revenue;
    existing.promotion_flag = existing.promotion_flag || row.promotion_flag;
    existing.stockout_flag = existing.stockout_flag || row.stockout_flag;
  }

  return Array.from(buckets.values()).sort((a, b) => a.date.localeCompare(b.date));
}
