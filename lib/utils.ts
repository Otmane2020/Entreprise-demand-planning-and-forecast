import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, compact = false): string {
  if (compact) {
    if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
}

export function formatNumber(value: number, compact = false): string {
  if (compact) {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  }
  return new Intl.NumberFormat('en-US').format(value);
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function getStatusColor(value: number, thresholds: { green: number; orange: number }, higherIsBetter = true) {
  if (higherIsBetter) {
    if (value >= thresholds.green) return 'text-emerald-500';
    if (value >= thresholds.orange) return 'text-amber-500';
    return 'text-rose-500';
  } else {
    if (value <= thresholds.green) return 'text-emerald-500';
    if (value <= thresholds.orange) return 'text-amber-500';
    return 'text-rose-500';
  }
}

export function getStatusBadgeColor(value: number, thresholds: { green: number; orange: number }, higherIsBetter = true) {
  if (higherIsBetter) {
    if (value >= thresholds.green) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    if (value >= thresholds.orange) return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
  } else {
    if (value <= thresholds.green) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    if (value <= thresholds.orange) return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
  }
}

export function generateMockSalesData(months = 24) {
  const data = [];
  const now = new Date();
  for (let i = months; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const base = 1000 + Math.random() * 500;
    const seasonal = Math.sin((date.getMonth() / 12) * 2 * Math.PI) * 200;
    const trend = (months - i) * 5;
    const noise = (Math.random() - 0.5) * 150;
    const units = Math.max(0, Math.round(base + seasonal + trend + noise));
    data.push({
      date: date.toISOString().slice(0, 7),
      actual: units,
      forecast: Math.round(units * (0.9 + Math.random() * 0.2)),
      lower: Math.round(units * 0.85),
      upper: Math.round(units * 1.15),
    });
  }
  return data;
}

export function calculateABCClass(revenueShare: number): 'A' | 'B' | 'C' {
  if (revenueShare >= 0.8) return 'A';
  if (revenueShare >= 0.95) return 'B';
  return 'C';
}

export function calculateXYZClass(cv: number): 'X' | 'Y' | 'Z' {
  if (cv <= 0.1) return 'X';
  if (cv <= 0.25) return 'Y';
  return 'Z';
}

export function calcSafetyStock(zScore: number, forecastError: number, leadTimeDays: number): number {
  return zScore * forecastError * Math.sqrt(leadTimeDays);
}

export function calcROP(avgDailyDemand: number, leadTimeDays: number, safetyStock: number): number {
  return avgDailyDemand * leadTimeDays + safetyStock;
}

export function calcCoverageDays(currentStock: number, avgDailyDemand: number): number {
  if (avgDailyDemand <= 0) return 0;
  return currentStock / avgDailyDemand;
}

export function getServiceLevelZ(serviceLevel: number): number {
  const table: Record<number, number> = {
    90: 1.28, 91: 1.34, 92: 1.41, 93: 1.48, 94: 1.56,
    95: 1.645, 96: 1.75, 97: 1.88, 98: 2.05, 99: 2.33, 99.5: 2.58,
  };
  return table[Math.round(serviceLevel)] ?? 1.645;
}
