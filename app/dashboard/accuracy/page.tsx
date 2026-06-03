'use client';

import { formatPercent } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { ChartCard, MapeChart, BiasTrendChart } from '@/components/charts';
import { KpiCard } from '@/components/kpi-card';
import { Activity, Target, TrendingUp, BarChart3 } from 'lucide-react';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts';
import { useAppData } from '@/lib/import-data-context';
import { useMemo } from 'react';

export default function AccuracyPage() {
  const { productMetrics, mapeTrend, hasImportedData } = useAppData();

  const PRODUCT_METRICS = useMemo(
    () =>
      productMetrics.map(p => ({
        ...p,
        accuracy: Math.max(50, 100 - p.mape),
        model: 'Auto',
      })),
    [productMetrics]
  );

  const BIAS_DATA = mapeTrend.map((d, i) => ({
    month: d.month,
    bias: parseFloat((Math.sin(i / 2) * 3 - 1).toFixed(1)),
  }));

  const avgMape = PRODUCT_METRICS.reduce((s, p) => s + p.mape, 0) / Math.max(PRODUCT_METRICS.length, 1);
  const avgWape = PRODUCT_METRICS.reduce((s, p) => s + p.wape, 0) / Math.max(PRODUCT_METRICS.length, 1);
  const avgAccuracy = PRODUCT_METRICS.reduce((s, p) => s + p.accuracy, 0) / Math.max(PRODUCT_METRICS.length, 1);
  const avgBias = PRODUCT_METRICS.reduce((s, p) => s + p.bias, 0) / Math.max(PRODUCT_METRICS.length, 1);

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold">Forecast Accuracy</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {hasImportedData ? 'Métriques calculées depuis l\'import' : 'MAPE, WAPE, Bias par SKU'}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="Avg MAPE" value={formatPercent(avgMape)} status="orange" icon={<Activity className="w-4 h-4" />} />
        <KpiCard title="Avg WAPE" value={formatPercent(avgWape)} status="orange" icon={<BarChart3 className="w-4 h-4" />} />
        <KpiCard title="Avg Accuracy" value={formatPercent(avgAccuracy)} status="green" icon={<Target className="w-4 h-4" />} />
        <KpiCard title="Avg Bias" value={`${avgBias > 0 ? '+' : ''}${avgBias.toFixed(1)}%`} status="blue" icon={<TrendingUp className="w-4 h-4" />} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChartCard title="MAPE Trend" subtitle="12 derniers mois">
          <MapeChart data={mapeTrend} height={240} />
        </ChartCard>
        <ChartCard title="Bias Trend" subtitle="Systématique sur/sous-prévision">
          <BiasTrendChart data={BIAS_DATA} height={240} />
        </ChartCard>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">SKU</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Produit</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Famille</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">MAPE</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">WAPE</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Bias</th>
            </tr>
          </thead>
          <tbody>
            {PRODUCT_METRICS.map((p, idx) => (
              <tr key={p.sku} className={cn('border-b last:border-0', idx % 2 === 1 && 'bg-muted/5')}>
                <td className="px-4 py-3 font-mono text-xs">{p.sku}</td>
                <td className="px-4 py-3 font-medium">{p.name}</td>
                <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{p.family ?? '—'}</td>
                <td className={cn('px-4 py-3 text-right font-mono text-xs', p.mape <= 12 ? 'text-emerald-400' : 'text-amber-400')}>
                  {formatPercent(p.mape)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground hidden lg:table-cell">
                  {formatPercent(p.wape)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs hidden lg:table-cell">{p.bias.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
