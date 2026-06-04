'use client';

import { MOCK_PRODUCTS, MOCK_MAPE_TREND } from '@/lib/mock-data';
import { formatPercent } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { ChartCard, MapeChart, BiasTrendChart } from '@/components/charts';
import { KpiCard } from '@/components/kpi-card';
import { Activity, Target, TrendingUp, BarChart3 } from 'lucide-react';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts';

const PRODUCT_METRICS = MOCK_PRODUCTS.map(p => ({
  ...p,
  mape: 8 + Math.random() * 18,
  wape: 6 + Math.random() * 15,
  bias: (Math.random() - 0.5) * 8,
  accuracy: 78 + Math.random() * 18,
  model: ['Holt-Winters', 'SARIMA', 'Prophet', 'XGBoost', 'ETS'][Math.floor(Math.random() * 5)],
}));

const BIAS_DATA = MOCK_MAPE_TREND.map((d, i) => ({
  month: d.month,
  bias: parseFloat((Math.sin(i / 2) * 3 - 1).toFixed(1)),
}));

const RADAR_DATA = [
  { metric: 'Accuracy', Electronics: 88, Apparel: 82, Food: 94, Home: 75, Sports: 79 },
  { metric: 'Coverage', Electronics: 75, Apparel: 88, Food: 95, Home: 82, Sports: 71 },
  { metric: 'Bias', Electronics: 91, Apparel: 86, Food: 93, Home: 78, Sports: 85 },
  { metric: 'MAPE', Electronics: 82, Apparel: 76, Food: 91, Home: 70, Sports: 74 },
  { metric: 'FVA', Electronics: 78, Apparel: 72, Food: 88, Home: 68, Sports: 70 },
];

export default function AccuracyPage() {
  const avgMape = PRODUCT_METRICS.reduce((s, p) => s + p.mape, 0) / PRODUCT_METRICS.length;
  const avgWape = PRODUCT_METRICS.reduce((s, p) => s + p.wape, 0) / PRODUCT_METRICS.length;
  const avgAccuracy = PRODUCT_METRICS.reduce((s, p) => s + p.accuracy, 0) / PRODUCT_METRICS.length;
  const avgBias = PRODUCT_METRICS.reduce((s, p) => s + p.bias, 0) / PRODUCT_METRICS.length;

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold">Forecast Accuracy</h1>
        <p className="text-sm text-muted-foreground mt-0.5">KPI monitoring and error analysis across all SKUs</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          title="Forecast Accuracy"
          value={formatPercent(avgAccuracy)}
          status={avgAccuracy >= 90 ? 'green' : avgAccuracy >= 80 ? 'orange' : 'red'}
          icon={<Target className="w-4 h-4" />}
          subtitle="Target: 90%"
          trend={1.4}
          trendLabel="vs last month"
        />
        <KpiCard
          title="Average MAPE"
          value={formatPercent(avgMape)}
          status={avgMape <= 10 ? 'green' : avgMape <= 20 ? 'orange' : 'red'}
          icon={<Activity className="w-4 h-4" />}
          subtitle="Target: ≤10%"
          trend={-1.8}
          trendLabel="vs last month"
        />
        <KpiCard
          title="Average WAPE"
          value={formatPercent(avgWape)}
          status={avgWape <= 10 ? 'green' : avgWape <= 18 ? 'orange' : 'red'}
          icon={<BarChart3 className="w-4 h-4" />}
          subtitle="Volume-weighted"
          trend={-1.2}
          trendLabel="vs last month"
        />
        <KpiCard
          title="Forecast Bias"
          value={`${avgBias > 0 ? '+' : ''}${avgBias.toFixed(1)}%`}
          status={Math.abs(avgBias) <= 3 ? 'green' : Math.abs(avgBias) <= 7 ? 'orange' : 'red'}
          icon={<TrendingUp className="w-4 h-4" />}
          subtitle={avgBias > 0 ? 'Over-forecasting' : 'Under-forecasting'}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <ChartCard title="MAPE & WAPE Trend" subtitle="12-month error evolution" className="xl:col-span-2">
          <MapeChart data={MOCK_MAPE_TREND} height={240} />
        </ChartCard>
        <ChartCard title="Accuracy by Category" subtitle="Radar view — higher is better">
          <ResponsiveContainer width="100%" height={240}>
            <RadarChart data={RADAR_DATA} cx="50%" cy="50%" outerRadius={90}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
              <Radar name="Electronics" dataKey="Electronics" stroke="hsl(213,94%,55%)" fill="hsl(213,94%,55%)" fillOpacity={0.15} />
              <Radar name="Food" dataKey="Food" stroke="hsl(142,71%,50%)" fill="hsl(142,71%,50%)" fillOpacity={0.15} />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
            </RadarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ChartCard title="Bias Trend" subtitle="Monthly over/under-forecast indicator">
        <BiasTrendChart data={BIAS_DATA} height={180} />
      </ChartCard>

      {/* Per-product accuracy table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b">
          <h3 className="text-sm font-semibold">Per-SKU Accuracy Breakdown</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Latest period metrics — sorted by MAPE</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/20">
              {['SKU', 'Product', 'Model', 'Accuracy', 'MAPE', 'WAPE', 'Bias', 'Status'].map(h => (
                <th key={h} className={cn('py-2.5 text-xs font-medium text-muted-foreground', h === 'SKU' || h === 'Product' || h === 'Model' ? 'text-left px-4' : 'text-right px-4')}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...PRODUCT_METRICS].sort((a, b) => a.mape - b.mape).map(p => (
              <tr key={p.sku} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{p.sku}</td>
                <td className="px-4 py-2.5 font-medium">{p.product_name}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{p.model}</td>
                <td className={cn('px-4 py-2.5 text-right font-mono text-xs', p.accuracy >= 90 ? 'text-emerald-400' : p.accuracy >= 80 ? 'text-amber-400' : 'text-rose-400')}>
                  {formatPercent(p.accuracy)}
                </td>
                <td className={cn('px-4 py-2.5 text-right font-mono text-xs', p.mape <= 10 ? 'text-emerald-400' : p.mape <= 20 ? 'text-amber-400' : 'text-rose-400')}>
                  {formatPercent(p.mape)}
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-xs text-muted-foreground">{formatPercent(p.wape)}</td>
                <td className={cn('px-4 py-2.5 text-right font-mono text-xs', Math.abs(p.bias) <= 3 ? 'text-emerald-400' : 'text-amber-400')}>
                  {p.bias > 0 ? '+' : ''}{p.bias.toFixed(1)}%
                </td>
                <td className="px-4 py-2.5 text-right">
                  <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium',
                    p.accuracy >= 90 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                    p.accuracy >= 80 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                    'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  )}>
                    {p.accuracy >= 90 ? 'Good' : p.accuracy >= 80 ? 'Fair' : 'Poor'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
